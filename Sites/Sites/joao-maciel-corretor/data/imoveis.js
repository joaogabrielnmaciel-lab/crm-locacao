// Dados de imóveis — substitua por fetch da API quando disponível:
// const res = await fetch('https://sua-api.com/api/imoveis');
// const IMOVEIS = await res.json();

const WA = '5547996268759';

// Bairros por cidade — alimenta o filtro cascata
const BAIRROS_POR_CIDADE = {
  'Tijucas':    ['Bosque da Mata', 'Centro', 'Barra do Rio', 'São Gregório', 'Nações', 'Rio da Areia'],
  'Camboriú':   ['Centro', 'Nações', 'Barra'],
  'Itajaí':     ['Fazenda', 'Centro', 'Cordeiros', 'Murta'],
  'Porto Belo': ['Centro', 'Perequê', 'Porto Belo'],
  'Bombinhas':  ['Centro', 'Mariscal', 'Bombas'],
  'Biguaçu':    ['Jardim Perequê', 'Centro', 'Fundos'],
};

const IMOVEIS = [
  // ── BOSQUE DA MATA — Tijucas (foco principal) ───────────────
  {
    id: 1,
    slug: "casa-terrea-3-quartos-bosque-da-mata-tijucas",
    titulo: "Casa Térrea 3 Quartos — Bosque da Mata",
    tipo: "casa",
    cidade: "Tijucas",
    bairro: "Bosque da Mata",
    preco: 420000,
    quartos: 3,
    banheiros: 2,
    vagas: 2,
    area: 160,
    descricao: "Excelente casa no Bosque da Mata, um dos bairros mais valorizados de Tijucas. Sala ampla, cozinha planejada, suíte com closet, quintal com churrasqueira e dois carros cobertos. Próxima a escolas, supermercados e com fácil acesso à BR-101.",
    fotos: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80"
    ],
    destaque: true,
    whatsapp: WA
  },
  {
    id: 2,
    slug: "casa-4-quartos-piscina-bosque-da-mata-tijucas",
    titulo: "Casa 4 Quartos com Piscina — Bosque da Mata",
    tipo: "casa",
    cidade: "Tijucas",
    bairro: "Bosque da Mata",
    preco: 680000,
    quartos: 4,
    banheiros: 3,
    vagas: 3,
    area: 240,
    descricao: "Residência de alto padrão no Bosque da Mata. Área gourmet completa, piscina aquecida, suíte master com banheira, escritório e 3 vagas cobertas. Acabamento impecável, pronta para morar.",
    fotos: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
    ],
    destaque: true,
    whatsapp: WA
  },
  {
    id: 3,
    slug: "casa-2-quartos-reformada-bosque-da-mata-tijucas",
    titulo: "Casa 2 Quartos Reformada — Bosque da Mata",
    tipo: "casa",
    cidade: "Tijucas",
    bairro: "Bosque da Mata",
    preco: 310000,
    quartos: 2,
    banheiros: 1,
    vagas: 1,
    area: 95,
    descricao: "Casa totalmente reformada no Bosque da Mata. Cozinha nova, banheiro renovado, calçada pavimentada e jardim. Ótima para primeiro imóvel ou investimento.",
    fotos: [
      "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800&q=80"
    ],
    destaque: false,
    whatsapp: WA
  },
  {
    id: 4,
    slug: "terreno-360m2-bosque-da-mata-tijucas",
    titulo: "Terreno 360m² em Rua Pavimentada — Bosque da Mata",
    tipo: "terreno",
    cidade: "Tijucas",
    bairro: "Bosque da Mata",
    preco: 155000,
    quartos: 0,
    banheiros: 0,
    vagas: 0,
    area: 360,
    descricao: "Terreno plano no Bosque da Mata com frente para rua pavimentada, rede de água, esgoto e energia elétrica. Documentação em dia, pronto para construir sua casa dos sonhos.",
    fotos: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"
    ],
    destaque: false,
    whatsapp: WA
  },
  {
    id: 5,
    slug: "terreno-500m2-esquina-bosque-da-mata-tijucas",
    titulo: "Terreno 500m² Esquina — Bosque da Mata",
    tipo: "terreno",
    cidade: "Tijucas",
    bairro: "Bosque da Mata",
    preco: 195000,
    quartos: 0,
    banheiros: 0,
    vagas: 0,
    area: 500,
    descricao: "Terreno de esquina no Bosque da Mata. Topografia plana, ótima visibilidade, ideal para construção residencial ou pequeno empreendimento. Perto de comércio e serviços.",
    fotos: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80"
    ],
    destaque: true,
    whatsapp: WA
  },
  // ── OUTROS BAIRROS — Tijucas ─────────────────────────────────
  {
    id: 6,
    slug: "casa-amplo-quintal-centro-tijucas",
    titulo: "Casa com Amplo Quintal no Centro",
    tipo: "casa",
    cidade: "Tijucas",
    bairro: "Centro",
    preco: 380000,
    quartos: 3,
    banheiros: 2,
    vagas: 2,
    area: 148,
    descricao: "Excelente casa no coração de Tijucas. Ampla sala, cozinha reformada, quintal com churrasqueira e dois banheiros completos. Próxima ao comércio, escolas e transporte.",
    fotos: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80"
    ],
    destaque: false,
    whatsapp: WA
  },
  {
    id: 7,
    slug: "terreno-450m2-barra-do-rio-tijucas",
    titulo: "Terreno Plano 450m² — Barra do Rio",
    tipo: "terreno",
    cidade: "Tijucas",
    bairro: "Barra do Rio",
    preco: 120000,
    quartos: 0,
    banheiros: 0,
    vagas: 0,
    area: 450,
    descricao: "Terreno plano em loteamento estruturado com ruas pavimentadas, rede elétrica e água. Ótima localização, tranquilo e com fácil acesso à BR-101.",
    fotos: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"
    ],
    destaque: false,
    whatsapp: WA
  },
  // ── OUTRAS CIDADES ───────────────────────────────────────────
  {
    id: 8,
    slug: "apartamento-2-quartos-camboriu",
    titulo: "Apartamento 2 Quartos Próximo ao Mar",
    tipo: "apartamento",
    cidade: "Camboriú",
    bairro: "Centro",
    preco: 290000,
    quartos: 2,
    banheiros: 1,
    vagas: 1,
    area: 72,
    descricao: "Apartamento luminoso com varanda gourmet e vaga coberta. Condomínio com piscina e academia.",
    fotos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
    ],
    destaque: false,
    whatsapp: WA
  },
  {
    id: 9,
    slug: "casa-condominio-4-quartos-porto-belo",
    titulo: "Casa Condomínio Fechado 4 Quartos",
    tipo: "casa",
    cidade: "Porto Belo",
    bairro: "Centro",
    preco: 650000,
    quartos: 4,
    banheiros: 3,
    vagas: 2,
    area: 220,
    descricao: "Casa em condomínio fechado com portaria 24h. Piscina privativa, suíte master com closet e área gourmet completa.",
    fotos: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"
    ],
    destaque: false,
    whatsapp: WA
  },
  {
    id: 10,
    slug: "apartamento-3-quartos-suite-itajai",
    titulo: "Apartamento 3 Quartos com Suíte",
    tipo: "apartamento",
    cidade: "Itajaí",
    bairro: "Fazenda",
    preco: 420000,
    quartos: 3,
    banheiros: 2,
    vagas: 2,
    area: 105,
    descricao: "Apartamento espaçoso no bairro Fazenda. Suíte, sacada gourmet com churrasqueira, condomínio com piscina e sauna.",
    fotos: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"
    ],
    destaque: false,
    whatsapp: WA
  },
  {
    id: 11,
    slug: "sala-comercial-centro-tijucas",
    titulo: "Sala Comercial no Centro",
    tipo: "comercial",
    cidade: "Tijucas",
    bairro: "Centro",
    preco: 180000,
    quartos: 0,
    banheiros: 1,
    vagas: 1,
    area: 45,
    descricao: "Sala comercial ampla no centro de Tijucas. Piso de porcelanato, ar-condicionado incluso. Ideal para escritório, consultório ou clínica.",
    fotos: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
    ],
    destaque: false,
    whatsapp: WA
  },
];
