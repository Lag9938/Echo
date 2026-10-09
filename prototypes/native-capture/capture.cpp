// Protótipo do capturador próprio do Echo: pega a imagem do monitor direto da placa de vídeo (DXGI Desktop
// Duplication) e a deixa em texturas compartilhadas, sem copiar nada para a memória. Não toca em nenhum outro
// processo: só usa a API pública de captura de tela do Windows.
//
// Uso: capture.exe <pid do Echo> [fps=60] [quantidade de texturas=6]
// Saída (uma linha por evento, em stdout):
//   T <indice> <handle no processo do Echo> <largura> <altura>   uma vez por textura
//   F <indice> <microssegundos>                                  a cada quadro novo
//   E <mensagem>                                                 erro
#include <windows.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <wrl/client.h>
#include <cstdio>
#include <cstdlib>
#include <vector>

using Microsoft::WRL::ComPtr;

static long long nowMicros() {
  static LARGE_INTEGER freq = [] { LARGE_INTEGER f; QueryPerformanceFrequency(&f); return f; }();
  LARGE_INTEGER t; QueryPerformanceCounter(&t);
  return t.QuadPart * 1000000LL / freq.QuadPart;
}

static void fail(const char* what, HRESULT hr) {
  printf("E %s (0x%08lX)\n", what, (unsigned long)hr);
  fflush(stdout);
}

int wmain(int argc, wchar_t** argv) {
  if (argc < 2) { printf("E uso: capture.exe <pid> [fps] [texturas]\n"); return 2; }
  const DWORD targetPid = (DWORD)_wtoi(argv[1]);
  const int fps = argc > 2 ? _wtoi(argv[2]) : 60;
  const int poolSize = argc > 3 ? _wtoi(argv[3]) : 6;

  HANDLE target = OpenProcess(PROCESS_DUP_HANDLE | SYNCHRONIZE, FALSE, targetPid);
  if (!target) { fail("OpenProcess", HRESULT_FROM_WIN32(GetLastError())); return 3; }

  ComPtr<ID3D11Device> device;
  ComPtr<ID3D11DeviceContext> context;
  HRESULT hr = D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                                 nullptr, 0, D3D11_SDK_VERSION, &device, nullptr, &context);
  if (FAILED(hr)) { fail("D3D11CreateDevice", hr); return 4; }

  ComPtr<IDXGIDevice> dxgiDevice; device.As(&dxgiDevice);
  ComPtr<IDXGIAdapter> adapter; dxgiDevice->GetAdapter(&adapter);
  ComPtr<IDXGIOutput> output;
  hr = adapter->EnumOutputs(0, &output);
  if (FAILED(hr)) { fail("EnumOutputs", hr); return 5; }
  ComPtr<IDXGIOutput1> output1; output.As(&output1);

  ComPtr<IDXGIOutputDuplication> dupl;
  hr = output1->DuplicateOutput(device.Get(), &dupl);
  if (FAILED(hr)) { fail("DuplicateOutput", hr); return 6; }
  DXGI_OUTDUPL_DESC duplDesc; dupl->GetDesc(&duplDesc);
  const UINT srcW = duplDesc.ModeDesc.Width, srcH = duplDesc.ModeDesc.Height;
  // Saida ja no tamanho de envio (cabe em maxW x maxH mantendo a proporcao), reduzida NA PLACA DE VIDEO:
  // assim o app nao precisa redimensionar nada antes de codificar
  const UINT maxW = argc > 4 ? (UINT)_wtoi(argv[4]) : 1920, maxH = argc > 5 ? (UINT)_wtoi(argv[5]) : 1080;
  double scale = 1.0;
  if (srcW > maxW) scale = (double)maxW / srcW;
  if (srcH * scale > maxH) scale = (double)maxH / srcH;
  const UINT width = ((UINT)(srcW * scale)) & ~1u, height = ((UINT)(srcH * scale)) & ~1u;

  ComPtr<ID3D11VideoDevice> videoDevice; device.As(&videoDevice);
  ComPtr<ID3D11VideoContext> videoContext; context.As(&videoContext);
  D3D11_VIDEO_PROCESSOR_CONTENT_DESC content = {};
  content.InputFrameFormat = D3D11_VIDEO_FRAME_FORMAT_PROGRESSIVE;
  content.InputWidth = srcW; content.InputHeight = srcH; content.OutputWidth = width; content.OutputHeight = height;
  content.Usage = D3D11_VIDEO_USAGE_PLAYBACK_NORMAL;
  ComPtr<ID3D11VideoProcessorEnumerator> vpEnum; ComPtr<ID3D11VideoProcessor> processor;
  hr = videoDevice->CreateVideoProcessorEnumerator(&content, &vpEnum);
  if (FAILED(hr)) { fail("CreateVideoProcessorEnumerator", hr); return 12; }
  hr = videoDevice->CreateVideoProcessor(vpEnum.Get(), 0, &processor);
  if (FAILED(hr)) { fail("CreateVideoProcessor", hr); return 13; }
  // Copia do quadro da tela (a textura da duplicacao nao aceita ser entrada do redimensionador diretamente)
  ComPtr<ID3D11Texture2D> staging;
  {
    D3D11_TEXTURE2D_DESC d = {};
    d.Width = srcW; d.Height = srcH; d.MipLevels = 1; d.ArraySize = 1; d.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    d.SampleDesc.Count = 1; d.Usage = D3D11_USAGE_DEFAULT; d.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;
    hr = device->CreateTexture2D(&d, nullptr, &staging);
    if (FAILED(hr)) { fail("CreateTexture2D entrada", hr); return 14; }
  }
  ComPtr<ID3D11VideoProcessorInputView> inputView;
  {
    D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC d = {}; d.ViewDimension = D3D11_VPIV_DIMENSION_TEXTURE2D;
    hr = videoDevice->CreateVideoProcessorInputView(staging.Get(), vpEnum.Get(), &d, &inputView);
    if (FAILED(hr)) { fail("CreateVideoProcessorInputView", hr); return 15; }
  }
  std::vector<ComPtr<ID3D11VideoProcessorOutputView>> outputViews(poolSize);

  // Texturas compartilhadas: o Echo abre cada uma pelo handle e lê direto da placa de vídeo
  std::vector<ComPtr<ID3D11Texture2D>> pool(poolSize);
  for (int i = 0; i < poolSize; i++) {
    D3D11_TEXTURE2D_DESC desc = {};
    desc.Width = width; desc.Height = height; desc.MipLevels = 1; desc.ArraySize = 1;
    desc.Format = (argc > 6 && wcscmp(argv[6], L"nv12") == 0) ? DXGI_FORMAT_NV12 : DXGI_FORMAT_B8G8R8A8_UNORM; desc.SampleDesc.Count = 1;
    desc.Usage = D3D11_USAGE_DEFAULT;
    desc.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;
    const bool keyed = desc.Format == DXGI_FORMAT_NV12;
    desc.MiscFlags = D3D11_RESOURCE_MISC_SHARED_NTHANDLE | (keyed ? D3D11_RESOURCE_MISC_SHARED_KEYEDMUTEX : D3D11_RESOURCE_MISC_SHARED);
    hr = device->CreateTexture2D(&desc, nullptr, &pool[i]);
    if (FAILED(hr)) { fail("CreateTexture2D", hr); return 7; }
    ComPtr<IDXGIResource1> resource; pool[i].As(&resource);
    HANDLE local = nullptr;
    hr = resource->CreateSharedHandle(nullptr, DXGI_SHARED_RESOURCE_READ | DXGI_SHARED_RESOURCE_WRITE, nullptr, &local);
    if (FAILED(hr)) { fail("CreateSharedHandle", hr); return 8; }
    HANDLE remote = nullptr;
    if (!DuplicateHandle(GetCurrentProcess(), local, target, &remote, 0, FALSE, DUPLICATE_SAME_ACCESS)) {
      fail("DuplicateHandle", HRESULT_FROM_WIN32(GetLastError())); return 9;
    }
    CloseHandle(local);
    {
      D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC d = {}; d.ViewDimension = D3D11_VPOV_DIMENSION_TEXTURE2D;
      hr = videoDevice->CreateVideoProcessorOutputView(pool[i].Get(), vpEnum.Get(), &d, &outputViews[i]);
      if (FAILED(hr)) { fail("CreateVideoProcessorOutputView", hr); return 16; }
    }
    printf("T %d %llu %u %u\n", i, (unsigned long long)(ULONG_PTR)remote, width, height);
  }
  fflush(stdout);

  const long long interval = 1000000LL / (fps > 0 ? fps : 60);
  long long lastSent = 0;
  int next = 0;
  while (WaitForSingleObject(target, 0) == WAIT_TIMEOUT) {
    DXGI_OUTDUPL_FRAME_INFO info = {};
    ComPtr<IDXGIResource> frameResource;
    hr = dupl->AcquireNextFrame(100, &info, &frameResource);
    if (hr == DXGI_ERROR_WAIT_TIMEOUT) continue;  // tela parada: nenhum quadro novo
    if (hr == DXGI_ERROR_ACCESS_LOST) {
      // Troca de modo de vídeo, tela de bloqueio, jogo entrando em tela cheia: refaz a duplicação
      dupl.Reset();
      for (int tries = 0; tries < 50 && !dupl; tries++) {
        Sleep(100);
        output1->DuplicateOutput(device.Get(), &dupl);
      }
      if (!dupl) { fail("DuplicateOutput depois de ACCESS_LOST", hr); return 10; }
      printf("E duplicacao refeita\n"); fflush(stdout);
      continue;
    }
    if (FAILED(hr)) { fail("AcquireNextFrame", hr); return 11; }

    const long long now = nowMicros();
    // Só o cursor mexeu, ou ainda não deu o intervalo do FPS pedido: solta o quadro sem enviar
    const bool hasImage = info.LastPresentTime.QuadPart != 0;
    if (!hasImage || now - lastSent < interval - 1500) { dupl->ReleaseFrame(); continue; }

    ComPtr<ID3D11Texture2D> frame; frameResource.As(&frame);
    context->CopyResource(staging.Get(), frame.Get());
    D3D11_VIDEO_PROCESSOR_STREAM stream = {}; stream.Enable = TRUE; stream.pInputSurface = inputView.Get();
    ComPtr<IDXGIKeyedMutex> mutex; pool[next].As(&mutex);
    if (mutex && FAILED(mutex->AcquireSync(0, 20))) { dupl->ReleaseFrame(); continue; }
    videoContext->VideoProcessorBlt(processor.Get(), outputViews[next].Get(), 0, 1, &stream);
    if (mutex) { context->Flush(); mutex->ReleaseSync(0); }
    context->Flush();
    dupl->ReleaseFrame();
    lastSent = now;
    printf("F %d %lld\n", next, now);
    fflush(stdout);
    next = (next + 1) % poolSize;
  }
  return 0;
}
