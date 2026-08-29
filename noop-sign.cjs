// noop-sign.cjs
// Script de assinatura nulo para ignorar a chamada ao signtool.exe durante o build do Electron.
// Útil para compilar builds em ambientes com restrições do WDAC/AppLocker.

exports.default = async function(configuration) {
  console.log("Ignorando assinatura de código para o arquivo:", configuration.path);
};
