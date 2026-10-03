// Recuperação de conta ("esqueci minha senha"). O app pede o e-mail de redefinição ao Supabase; o link do
// e-mail abre a página docs/recuperar/ (GitHub Pages), onde a pessoa cria a senha nova e volta para entrar.
// É por link e não por código porque o projeto usa o envio de e-mail padrão do Supabase, que não deixa
// editar o modelo do e-mail (só manda o link). A URL abaixo precisa estar nas "Redirect URLs" do projeto.

export const PASSWORD_RECOVERY_URL = 'https://lag9938.github.io/Echo/recuperar/'
