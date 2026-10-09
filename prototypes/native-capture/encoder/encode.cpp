// Protótipo do capturador + codificador próprio do Echo.
//
// Pega a imagem do monitor direto da placa de vídeo (DXGI Desktop Duplication), reduz e converte para NV12 na
// própria placa (processador de vídeo do Direct3D) e codifica em H.264 com o codificador de HARDWARE do
// Windows (Media Foundation: NVENC, AMF ou Quick Sync, o que a placa tiver). Nenhum quadro passa pela memória
// do computador antes de estar codificado. Não toca em nenhum outro processo.
//
// Uso:  encode.exe <pid do pai, 0 = nenhum> [fps=60] [larguraMax=1920] [alturaMax=1080] [bitrate=4000000]
// Saída (stdout, binária), um pacote por quadro codificado:
//   'E' 'V' <flags: bit0 = quadro-chave> 0 <int64 microssegundos> <uint32 tamanho> <H.264 Annex-B>
// Comandos (stdin, texto):  "K" = gerar quadro-chave   "B <bps>" = mudar a taxa   fim da entrada = encerrar
// Diagnóstico em stderr.
#include <windows.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mftransform.h>
#include <mferror.h>
#include <codecapi.h>
#include <strmif.h>
#include <wrl/client.h>
#include <atomic>
#include <thread>
#include <vector>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <io.h>
#include <fcntl.h>

using Microsoft::WRL::ComPtr;

static long long nowMicros() {
  static LARGE_INTEGER freq = [] { LARGE_INTEGER f; QueryPerformanceFrequency(&f); return f; }();
  LARGE_INTEGER t; QueryPerformanceCounter(&t);
  return t.QuadPart * 1000000LL / freq.QuadPart;
}

#define CHECK(hr, what) do { if (FAILED(hr)) { fprintf(stderr, "ERRO %s (0x%08lX)\n", what, (unsigned long)(hr)); fflush(stderr); return 1; } } while (0)

static std::atomic<bool> g_quit{false}, g_forceKey{false};
static std::atomic<long> g_newBitrate{0};

static void readCommands() {
  char line[128];
  while (fgets(line, sizeof(line), stdin)) {
    if (line[0] == 'K') g_forceKey = true;
    else if (line[0] == 'B') g_newBitrate = atol(line + 1);
  }
  g_quit = true;
}

static HRESULT setCodecU32(ICodecAPI* codec, const GUID& key, ULONG value) {
  VARIANT v; VariantInit(&v); v.vt = VT_UI4; v.ulVal = value;
  return codec->SetValue(&key, &v);
}
static HRESULT setCodecBool(ICodecAPI* codec, const GUID& key, bool value) {
  VARIANT v; VariantInit(&v); v.vt = VT_BOOL; v.boolVal = value ? VARIANT_TRUE : VARIANT_FALSE;
  return codec->SetValue(&key, &v);
}

// O quadro começa com SPS (NAL tipo 7)? Sem SPS/PPS um quadro-chave não é decodificável por quem acabou de entrar.
static bool startsWithSps(const BYTE* data, DWORD len) {
  for (DWORD i = 0; i + 4 < len && i < 64; i++) {
    if (data[i] == 0 && data[i + 1] == 0 && data[i + 2] == 1) return (data[i + 3] & 0x1F) == 7;
  }
  return false;
}

int wmain(int argc, wchar_t** argv) {
  const DWORD parentPid = argc > 1 ? (DWORD)_wtoi(argv[1]) : 0;
  const UINT fps = argc > 2 ? (UINT)_wtoi(argv[2]) : 60;
  const UINT maxW = argc > 3 ? (UINT)_wtoi(argv[3]) : 1920, maxH = argc > 4 ? (UINT)_wtoi(argv[4]) : 1080;
  UINT bitrate = argc > 5 ? (UINT)_wtoi(argv[5]) : 4000000;
  _setmode(_fileno(stdout), _O_BINARY);
  HANDLE parent = parentPid ? OpenProcess(SYNCHRONIZE, FALSE, parentPid) : nullptr;

  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED); CHECK(hr, "CoInitializeEx");
  hr = MFStartup(MF_VERSION); CHECK(hr, "MFStartup");

  // ── Placa de vídeo e duplicação do monitor ────────────────────────────────────────────────────────────
  ComPtr<ID3D11Device> device; ComPtr<ID3D11DeviceContext> context;
  hr = D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr,
                         D3D11_CREATE_DEVICE_BGRA_SUPPORT | D3D11_CREATE_DEVICE_VIDEO_SUPPORT,
                         nullptr, 0, D3D11_SDK_VERSION, &device, nullptr, &context);
  CHECK(hr, "D3D11CreateDevice");
  { ComPtr<ID3D10Multithread> mt; device.As(&mt); if (mt) mt->SetMultithreadProtected(TRUE); }

  ComPtr<IDXGIDevice> dxgiDevice; device.As(&dxgiDevice);
  ComPtr<IDXGIAdapter> adapter; dxgiDevice->GetAdapter(&adapter);
  DXGI_ADAPTER_DESC adapterDesc; adapter->GetDesc(&adapterDesc);
  ComPtr<IDXGIOutput> output; hr = adapter->EnumOutputs(0, &output); CHECK(hr, "EnumOutputs");
  ComPtr<IDXGIOutput1> output1; output.As(&output1);
  ComPtr<IDXGIOutputDuplication> dupl; hr = output1->DuplicateOutput(device.Get(), &dupl); CHECK(hr, "DuplicateOutput");
  DXGI_OUTDUPL_DESC duplDesc; dupl->GetDesc(&duplDesc);
  const UINT srcW = duplDesc.ModeDesc.Width, srcH = duplDesc.ModeDesc.Height;
  double scale = 1.0;
  if (srcW > maxW) scale = (double)maxW / srcW;
  if (srcH * scale > maxH) scale = (double)maxH / srcH;
  const UINT width = ((UINT)(srcW * scale)) & ~1u, height = ((UINT)(srcH * scale)) & ~1u;

  // ── Redução + conversão para NV12, na placa de vídeo ──────────────────────────────────────────────────
  ComPtr<ID3D11VideoDevice> videoDevice; device.As(&videoDevice);
  ComPtr<ID3D11VideoContext> videoContext; context.As(&videoContext);
  D3D11_VIDEO_PROCESSOR_CONTENT_DESC content = {};
  content.InputFrameFormat = D3D11_VIDEO_FRAME_FORMAT_PROGRESSIVE;
  content.InputWidth = srcW; content.InputHeight = srcH; content.OutputWidth = width; content.OutputHeight = height;
  content.Usage = D3D11_VIDEO_USAGE_PLAYBACK_NORMAL;
  ComPtr<ID3D11VideoProcessorEnumerator> vpEnum; ComPtr<ID3D11VideoProcessor> processor;
  hr = videoDevice->CreateVideoProcessorEnumerator(&content, &vpEnum); CHECK(hr, "CreateVideoProcessorEnumerator");
  hr = videoDevice->CreateVideoProcessor(vpEnum.Get(), 0, &processor); CHECK(hr, "CreateVideoProcessor");
  {
    // Tela: RGB faixa completa. Vídeo: BT.709 faixa de TV (16–235), o que os decodificadores esperam.
    D3D11_VIDEO_PROCESSOR_COLOR_SPACE in = {}; in.RGB_Range = 0;
    D3D11_VIDEO_PROCESSOR_COLOR_SPACE out = {}; out.YCbCr_Matrix = 1; out.Nominal_Range = 1;
    videoContext->VideoProcessorSetStreamColorSpace(processor.Get(), 0, &in);
    videoContext->VideoProcessorSetOutputColorSpace(processor.Get(), &out);
  }
  ComPtr<ID3D11Texture2D> screenCopy;
  {
    D3D11_TEXTURE2D_DESC d = {};
    d.Width = srcW; d.Height = srcH; d.MipLevels = 1; d.ArraySize = 1; d.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    d.SampleDesc.Count = 1; d.Usage = D3D11_USAGE_DEFAULT; d.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;
    hr = device->CreateTexture2D(&d, nullptr, &screenCopy); CHECK(hr, "CreateTexture2D copia da tela");
  }
  ComPtr<ID3D11VideoProcessorInputView> inputView;
  {
    D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC d = {}; d.ViewDimension = D3D11_VPIV_DIMENSION_TEXTURE2D;
    hr = videoDevice->CreateVideoProcessorInputView(screenCopy.Get(), vpEnum.Get(), &d, &inputView); CHECK(hr, "CreateVideoProcessorInputView");
  }
  // O codificador segura o quadro de entrada por um tempo: um rodízio de texturas evita escrever por cima
  const int poolSize = 8;
  std::vector<ComPtr<ID3D11Texture2D>> pool(poolSize);
  std::vector<ComPtr<ID3D11VideoProcessorOutputView>> outputViews(poolSize);
  for (int i = 0; i < poolSize; i++) {
    D3D11_TEXTURE2D_DESC d = {};
    d.Width = width; d.Height = height; d.MipLevels = 1; d.ArraySize = 1; d.Format = DXGI_FORMAT_NV12;
    d.SampleDesc.Count = 1; d.Usage = D3D11_USAGE_DEFAULT; d.BindFlags = D3D11_BIND_RENDER_TARGET;
    hr = device->CreateTexture2D(&d, nullptr, &pool[i]); CHECK(hr, "CreateTexture2D NV12");
    D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC ov = {}; ov.ViewDimension = D3D11_VPOV_DIMENSION_TEXTURE2D;
    hr = videoDevice->CreateVideoProcessorOutputView(pool[i].Get(), vpEnum.Get(), &ov, &outputViews[i]); CHECK(hr, "CreateVideoProcessorOutputView");
  }

  // ── Codificador H.264 de hardware (Media Foundation) ──────────────────────────────────────────────────
  UINT resetToken = 0; ComPtr<IMFDXGIDeviceManager> manager;
  hr = MFCreateDXGIDeviceManager(&resetToken, &manager); CHECK(hr, "MFCreateDXGIDeviceManager");
  hr = manager->ResetDevice(device.Get(), resetToken); CHECK(hr, "ResetDevice");

  ComPtr<IMFTransform> mft;
  {
    MFT_REGISTER_TYPE_INFO inInfo = { MFMediaType_Video, MFVideoFormat_NV12 };
    MFT_REGISTER_TYPE_INFO outInfo = { MFMediaType_Video, MFVideoFormat_H264 };
    ComPtr<IMFAttributes> enumAttrs; MFCreateAttributes(&enumAttrs, 1);
    enumAttrs->SetBlob(MFT_ENUM_ADAPTER_LUID, (const UINT8*)&adapterDesc.AdapterLuid, sizeof(LUID));
    IMFActivate** activates = nullptr; UINT32 count = 0;
    hr = MFTEnum2(MFT_CATEGORY_VIDEO_ENCODER, MFT_ENUM_FLAG_HARDWARE | MFT_ENUM_FLAG_SORTANDFILTER,
                  &inInfo, &outInfo, enumAttrs.Get(), &activates, &count);
    if (FAILED(hr) || count == 0) { fprintf(stderr, "ERRO nenhum codificador H.264 de hardware nesta placa (0x%08lX, %u)\n", (unsigned long)hr, count); return 1; }
    WCHAR name[256] = L"?"; activates[0]->GetString(MFT_FRIENDLY_NAME_Attribute, name, 256, nullptr);
    fprintf(stderr, "codificador: %ls | placa: %ls | tela %ux%u -> envio %ux%u a %u fps\n", name, adapterDesc.Description, srcW, srcH, width, height, fps);
    hr = activates[0]->ActivateObject(IID_PPV_ARGS(&mft));
    for (UINT32 i = 0; i < count; i++) activates[i]->Release();
    CoTaskMemFree(activates);
    CHECK(hr, "ActivateObject");
  }
  {
    ComPtr<IMFAttributes> attrs; mft->GetAttributes(&attrs);
    if (attrs) { attrs->SetUINT32(MF_TRANSFORM_ASYNC_UNLOCK, TRUE); attrs->SetUINT32(MF_LOW_LATENCY, TRUE); }
  }
  hr = mft->ProcessMessage(MFT_MESSAGE_SET_D3D_MANAGER, (ULONG_PTR)manager.Get()); CHECK(hr, "SET_D3D_MANAGER");

  ComPtr<IMFMediaType> outType; MFCreateMediaType(&outType);
  outType->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
  outType->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_H264);
  outType->SetUINT32(MF_MT_AVG_BITRATE, bitrate);
  MFSetAttributeSize(outType.Get(), MF_MT_FRAME_SIZE, width, height);
  MFSetAttributeRatio(outType.Get(), MF_MT_FRAME_RATE, fps, 1);
  MFSetAttributeRatio(outType.Get(), MF_MT_PIXEL_ASPECT_RATIO, 1, 1);
  outType->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive);
  outType->SetUINT32(MF_MT_MPEG2_PROFILE, eAVEncH264VProfile_High);
  // Quadro-chave só quando pedido: um por segundo (o padrão deste codificador) gasta taxa à toa e faz a
  // nitidez "pulsar". Vai nos dois lugares porque cada fabricante lê de um.
  outType->SetUINT32(MF_MT_MAX_KEYFRAME_SPACING, fps * 3600);
  { ComPtr<ICodecAPI> early; mft.As(&early); if (early) setCodecU32(early.Get(), CODECAPI_AVEncMPVGOPSize, fps * 3600); }
  hr = mft->SetOutputType(0, outType.Get(), 0); CHECK(hr, "SetOutputType");

  ComPtr<IMFMediaType> inType; MFCreateMediaType(&inType);
  inType->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
  inType->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_NV12);
  MFSetAttributeSize(inType.Get(), MF_MT_FRAME_SIZE, width, height);
  MFSetAttributeRatio(inType.Get(), MF_MT_FRAME_RATE, fps, 1);
  MFSetAttributeRatio(inType.Get(), MF_MT_PIXEL_ASPECT_RATIO, 1, 1);
  inType->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive);
  hr = mft->SetInputType(0, inType.Get(), 0); CHECK(hr, "SetInputType");

  ComPtr<ICodecAPI> codec; mft.As(&codec);
  if (codec) {
    // Tempo real: taxa constante, sem quadros B, sem atraso, quadro-chave só quando pedido
    HRESULT a = setCodecU32(codec.Get(), CODECAPI_AVEncCommonRateControlMode, eAVEncCommonRateControlMode_CBR);
    HRESULT b = setCodecU32(codec.Get(), CODECAPI_AVEncCommonMeanBitRate, bitrate);
    HRESULT c = setCodecBool(codec.Get(), CODECAPI_AVLowLatencyMode, true);
    HRESULT d = setCodecU32(codec.Get(), CODECAPI_AVEncMPVDefaultBPictureCount, 0);
    HRESULT e = setCodecU32(codec.Get(), CODECAPI_AVEncMPVGOPSize, fps * 3600);
    fprintf(stderr, "ajustes: taxa constante 0x%08lX, taxa 0x%08lX, baixa latencia 0x%08lX, sem quadros B 0x%08lX, intervalo de chave 0x%08lX\n",
            (unsigned long)a, (unsigned long)b, (unsigned long)c, (unsigned long)d, (unsigned long)e);
  }

  // Cabeçalho da sequência (SPS/PPS), para o caso de o codificador não o repetir em cada quadro-chave
  std::vector<BYTE> sequenceHeader;
  auto refreshHeader = [&]() {
    ComPtr<IMFMediaType> current;
    if (SUCCEEDED(mft->GetOutputCurrentType(0, &current))) {
      UINT32 size = 0;
      if (SUCCEEDED(current->GetBlobSize(MF_MT_MPEG_SEQUENCE_HEADER, &size)) && size > 0) {
        sequenceHeader.resize(size);
        current->GetBlob(MF_MT_MPEG_SEQUENCE_HEADER, sequenceHeader.data(), size, nullptr);
      }
    }
  };

  ComPtr<IMFMediaEventGenerator> events; hr = mft.As(&events); CHECK(hr, "codificador nao e assincrono (IMFMediaEventGenerator)");
  hr = mft->ProcessMessage(MFT_MESSAGE_COMMAND_FLUSH, 0);
  hr = mft->ProcessMessage(MFT_MESSAGE_NOTIFY_BEGIN_STREAMING, 0); CHECK(hr, "BEGIN_STREAMING");
  hr = mft->ProcessMessage(MFT_MESSAGE_NOTIFY_START_OF_STREAM, 0); CHECK(hr, "START_OF_STREAM");
  refreshHeader();

  std::thread(readCommands).detach();

  const long long interval = 1000000LL / (fps ? fps : 60);
  const long long start = nowMicros();
  long long lastSent = 0, lastReport = start;
  int next = 0, credits = 0; bool keyPending = false;
  unsigned long long captured = 0, encoded = 0, keys = 0, bytes = 0;

  auto drainOutput = [&]() -> bool {
    MFT_OUTPUT_STREAM_INFO info = {}; mft->GetOutputStreamInfo(0, &info);
    MFT_OUTPUT_DATA_BUFFER out = {}; DWORD status = 0;
    ComPtr<IMFSample> own;
    if (!(info.dwFlags & (MFT_OUTPUT_STREAM_PROVIDES_SAMPLES | MFT_OUTPUT_STREAM_CAN_PROVIDE_SAMPLES))) {
      ComPtr<IMFMediaBuffer> buffer; MFCreateSample(&own); MFCreateMemoryBuffer(info.cbSize ? info.cbSize : width * height * 2, &buffer);
      own->AddBuffer(buffer.Get()); out.pSample = own.Get();
    }
    HRESULT r = mft->ProcessOutput(0, 1, &out, &status);
    if (out.pEvents) out.pEvents->Release();
    if (r == MF_E_TRANSFORM_STREAM_CHANGE) {
      ComPtr<IMFMediaType> t;
      if (SUCCEEDED(mft->GetOutputAvailableType(0, 0, &t))) mft->SetOutputType(0, t.Get(), 0);
      refreshHeader();
      return true;
    }
    if (FAILED(r)) { if (r != MF_E_TRANSFORM_NEED_MORE_INPUT) fprintf(stderr, "ProcessOutput 0x%08lX\n", (unsigned long)r); return false; }
    ComPtr<IMFSample> sample; sample.Attach(out.pSample); if (own) sample->AddRef();
    LONGLONG time = 0; sample->GetSampleTime(&time);
    const bool key = MFGetAttributeUINT32(sample.Get(), MFSampleExtension_CleanPoint, 0) != 0;
    ComPtr<IMFMediaBuffer> buffer; sample->ConvertToContiguousBuffer(&buffer);
    BYTE* data = nullptr; DWORD len = 0; buffer->Lock(&data, nullptr, &len);
    const bool addHeader = key && !sequenceHeader.empty() && !startsWithSps(data, len);
    const unsigned int total = len + (addHeader ? (unsigned int)sequenceHeader.size() : 0);
    unsigned char head[16] = { 'E', 'V', (unsigned char)(key ? 1 : 0), 0 };
    const long long micros = time / 10; memcpy(head + 4, &micros, 8); memcpy(head + 12, &total, 4);
    fwrite(head, 1, 16, stdout);
    if (addHeader) fwrite(sequenceHeader.data(), 1, sequenceHeader.size(), stdout);
    fwrite(data, 1, len, stdout); fflush(stdout);
    buffer->Unlock();
    encoded++; bytes += total; if (key) keys++;
    return true;
  };

  while (!g_quit && (!parent || WaitForSingleObject(parent, 0) == WAIT_TIMEOUT)) {
    // Eventos do codificador: "quero entrada" (um crédito por quadro) e "tenho saída"
    for (;;) {
      ComPtr<IMFMediaEvent> event;
      if (events->GetEvent(MF_EVENT_FLAG_NO_WAIT, &event) != S_OK) break;
      MediaEventType type = MEUnknown; event->GetType(&type);
      if (type == METransformNeedInput) credits++;
      else if (type == METransformHaveOutput) drainOutput();
    }
    // Pedido de quadro-chave: vai pela opcao do codificador E marcado no proximo quadro de entrada (cada
    // fabricante atende por um caminho)
    if (g_forceKey.exchange(false)) {
      keyPending = true;
      HRESULT k = codec ? setCodecU32(codec.Get(), CODECAPI_AVEncVideoForceKeyFrame, 1) : E_NOINTERFACE;
      fprintf(stderr, "pedido de quadro-chave: opcao do codificador 0x%08lX\n", (unsigned long)k); fflush(stderr);
    }
    const long wanted = g_newBitrate.exchange(0);
    if (wanted > 0 && codec) { bitrate = (UINT)wanted; setCodecU32(codec.Get(), CODECAPI_AVEncCommonMeanBitRate, bitrate); }

    const long long now = nowMicros();
    if (now - lastReport >= 2000000) {
      fprintf(stderr, "estado: capturados %llu, codificados %llu, chaves %llu, %.1f Mbps, creditos %d\n", captured, encoded, keys, bytes * 8.0 / ((now - lastReport) / 1e6) / 1e6, credits);
      fflush(stderr); bytes = 0; lastReport = now;
    }
    if (credits <= 0) { Sleep(1); continue; }

    DXGI_OUTDUPL_FRAME_INFO info = {}; ComPtr<IDXGIResource> frameResource;
    hr = dupl->AcquireNextFrame(8, &info, &frameResource);
    if (hr == DXGI_ERROR_WAIT_TIMEOUT) continue;
    if (hr == DXGI_ERROR_ACCESS_LOST) {
      // Troca de modo de vídeo, tela de bloqueio, jogo entrando em tela cheia: refaz a duplicação
      dupl.Reset();
      for (int tries = 0; tries < 50 && !dupl && !g_quit; tries++) { Sleep(100); output1->DuplicateOutput(device.Get(), &dupl); }
      if (!dupl) { fprintf(stderr, "ERRO duplicacao perdida e nao refeita\n"); return 1; }
      fprintf(stderr, "duplicacao refeita\n"); continue;
    }
    if (FAILED(hr)) { fprintf(stderr, "ERRO AcquireNextFrame 0x%08lX\n", (unsigned long)hr); return 1; }
    const long long t = nowMicros();
    // Só o cursor mexeu, ou ainda não deu o intervalo do FPS pedido: solta o quadro sem codificar
    if (info.LastPresentTime.QuadPart == 0 || t - lastSent < interval - 1500) { dupl->ReleaseFrame(); continue; }

    ComPtr<ID3D11Texture2D> frame; frameResource.As(&frame);
    context->CopyResource(screenCopy.Get(), frame.Get());
    dupl->ReleaseFrame();
    D3D11_VIDEO_PROCESSOR_STREAM stream = {}; stream.Enable = TRUE; stream.pInputSurface = inputView.Get();
    videoContext->VideoProcessorBlt(processor.Get(), outputViews[next].Get(), 0, 1, &stream);
    captured++; lastSent = t;

    ComPtr<IMFMediaBuffer> buffer;
    hr = MFCreateDXGISurfaceBuffer(__uuidof(ID3D11Texture2D), pool[next].Get(), 0, FALSE, &buffer);
    if (FAILED(hr)) { fprintf(stderr, "ERRO MFCreateDXGISurfaceBuffer 0x%08lX\n", (unsigned long)hr); return 1; }
    ComPtr<IMFSample> sample; MFCreateSample(&sample); sample->AddBuffer(buffer.Get());
    sample->SetSampleTime((t - start) * 10); sample->SetSampleDuration(interval * 10);
    if (keyPending) { sample->SetUINT32(MFSampleExtension_VideoEncodePictureType, eAVEncH264PictureType_IDR); keyPending = false; }
    hr = mft->ProcessInput(0, sample.Get(), 0);
    if (FAILED(hr)) { fprintf(stderr, "ProcessInput 0x%08lX\n", (unsigned long)hr); if (hr != MF_E_NOTACCEPTING) return 1; }
    else credits--;
    next = (next + 1) % poolSize;
  }
  mft->ProcessMessage(MFT_MESSAGE_NOTIFY_END_OF_STREAM, 0);
  MFShutdown();
  return 0;
}
