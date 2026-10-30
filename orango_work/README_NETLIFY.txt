CAMPO MINADO ORANGO — PUBLICAÇÃO NO NETLIFY + SUPABASE

O QUE ESTA VERSÃO FAZ
- Publica a interface estática no Netlify.
- Usa Netlify Functions como API serverless.
- Usa Supabase Postgres para compartilhar jogadores, pontuações, histórico e conquistas entre visitantes.
- Cria uma sessão anônima por navegador via Supabase Auth. O progresso fica associado à sessão daquele navegador.
- O ranking é compartilhado entre todos os visitantes do mesmo site.
- A exclusão no ranking só aparece para o próprio jogador; não é possível excluir outros participantes.

IMPORTANTE: NÃO É POSSÍVEL PUBLICAR O FLASK ORIGINAL DIRETAMENTE NO NETLIFY. Esta pasta foi adaptada para site estático + Netlify Functions.

PASSO 1 — CRIAR O BANCO ONLINE
1. Crie um projeto no Supabase.
2. No painel do Supabase, abra Authentication > Sign In / Providers e habilite Anonymous Sign-Ins.
3. Abra SQL Editor > New query.
4. Copie todo o conteúdo de supabase/schema.sql, cole no editor e execute.
5. Em Project Settings > API, copie Project URL, publishable key (ou anon key) e service_role key.

PASSO 2 — CONFIGURAR O SITE
1. Abra static/js/config.js.
2. Substitua COLE_A_URL_DO_SUPABASE_AQUI pela Project URL.
3. Substitua COLE_A_CHAVE_PUBLISHABLE_OU_ANON_AQUI pela publishable/anon key.
   A publishable/anon key pode estar no navegador, mas a service_role NÃO pode.

PASSO 3 — CONFIGURAR SEGREDOS NO NETLIFY
Depois de criar o site no Netlify, abra Project configuration > Environment variables e adicione:
- SUPABASE_URL = sua Project URL
- SUPABASE_ANON_KEY = sua publishable/anon key
- SUPABASE_SERVICE_ROLE_KEY = sua service_role key (SEGREDO; somente Functions)
Defina o escopo da service role para Functions. Nunca coloque essa chave em static/js/config.js, HTML, Git ou ZIP público.

PASSO 4 — PUBLICAR
1. Envie a pasta inteira deste projeto para um repositório Git (recomendado) ou publique pelo método de deploy manual compatível com Functions. Para garantir que as Netlify Functions sejam incluídas, prefira conectar um repositório Git ao Netlify.
2. Em Build settings, deixe Publish directory como . (raiz) e Functions directory como netlify/functions. O netlify.toml já configura isso.
3. Faça o deploy. Depois de cadastrar/alterar variáveis de ambiente, faça um novo deploy.
4. Abra o endereço .netlify.app criado pelo Netlify.

ESTRUTURA IMPORTANTE
- index.html: página inicial (gerada a partir do template Flask)
- static/: CSS, imagens e JavaScript
- static/js/config.js: URL e chave pública Supabase
- netlify/functions/api.mjs: API do ranking e pontuação
- supabase/schema.sql: tabelas e permissões do banco
- netlify.toml: rotas e configuração de publicação

LIMITES E SEGURANÇA
- O login é anônimo: cada navegador recebe uma identidade de visitante. Se a pessoa limpar os dados do navegador ou trocar de aparelho, a sessão anônima pode não ser recuperada. Para progresso transferível entre dispositivos, será necessário implementar cadastro/login.
- O ranking compartilhado não é a conta oficial do Orango.
- A service_role key tem acesso administrativo total ao banco e deve ficar somente nas variáveis de ambiente das Functions.
- Esta adaptação é adequada como protótipo. Para competição pública, ainda é necessário reforçar a validação das ações do jogo no servidor, rate limiting e proteção contra automação/manipulação.
- A função Excluir remove apenas o jogador da sessão atual, não outros participantes.

TESTES
A sintaxe dos arquivos JavaScript foi verificada localmente. O deploy, autenticação Supabase e chamadas reais ao banco precisam ser testados depois que você inserir suas próprias credenciais e executar o SQL no seu projeto.
