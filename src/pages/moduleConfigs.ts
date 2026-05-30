import type { ComplianceModuleConfig } from '../components/ComplianceModule';

const statusPadrao = [
  { label: 'Conforme', value: 'conforme' },
  { label: 'Não conforme', value: 'nao-conforme' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Em análise', value: 'em-analise' },
];

const statusDocumento = [
  { label: 'Ativo', value: 'ativo' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Vencido', value: 'vencido' },
  { label: 'Em análise', value: 'em-analise' },
];

export const laudoEnsaiosEletricosConfig: ComplianceModuleConfig = {
  title: 'Laudo de Ensaios Elétricos',
  subtitle: 'Registre medições, ensaios, evidências e resultados técnicos relacionados às instalações elétricas do prontuário.',
  collectionName: 'electricalTestReports',
  storageFolder: 'laudos-ensaios-eletricos',
  documentLabel: 'laudo de ensaio elétrico',
  newButtonLabel: 'Novo laudo',
  emptyMessage: 'Nenhum laudo de ensaio elétrico cadastrado.',
  statusOptions: statusPadrao,
  guidance: [
    'Use este módulo para ensaios de resistência de isolamento, continuidade do PE, teste de DR/IDR, aterramento, termografia e qualidade de energia.',
    'Anexe o PDF do laudo, fotos de evidência, prints de instrumentos ou planilhas de medição.',
    'Registre sempre o local ensaiado, instrumento utilizado, resultado e recomendação técnica.',
  ],
  referenceItems: [
    'Relatório de ensaio com valores medidos e conclusão técnica.',
    'Evidência fotográfica da medição ou instrumento utilizado.',
    'Identificação do circuito, painel, quadro ou equipamento ensaiado.',
  ],
  fields: [
    { name: 'titulo', label: 'Título do laudo', required: true, placeholder: 'Ex: Ensaio de isolamento do QGBT' },
    { name: 'local', label: 'Local / setor', required: true, placeholder: 'Ex: Sala elétrica principal' },
    {
      name: 'tipoEnsaio',
      label: 'Tipo de ensaio',
      type: 'select',
      required: true,
      options: [
        { label: 'Resistência de isolamento', value: 'resistencia-isolamento' },
        { label: 'Continuidade do condutor de proteção', value: 'continuidade-pe' },
        { label: 'Teste de DR/IDR', value: 'dr-idr' },
        { label: 'Medição de aterramento', value: 'aterramento' },
        { label: 'Inspeção termográfica', value: 'termografia' },
        { label: 'Qualidade de energia', value: 'qualidade-energia' },
        { label: 'Comissionamento de quadro', value: 'comissionamento-quadro' },
        { label: 'Outro', value: 'outro' },
      ],
    },
    { name: 'instrumento', label: 'Instrumento utilizado', placeholder: 'Ex: Megômetro, terrômetro, termovisor, analisador de energia' },
    { name: 'valorMedido', label: 'Valor medido / resultado', placeholder: 'Ex: 500 MΩ, 3,8 Ω, ΔT 28 °C' },
    { name: 'dataEnsaio', label: 'Data do ensaio', type: 'date' },
    { name: 'responsavelTecnico', label: 'Responsável técnico', placeholder: 'Nome do profissional habilitado' },
    { name: 'observacoes', label: 'Análise técnica e recomendações', type: 'textarea', colSpan: 'full' },
  ],
};

export const laudosNR12Config: ComplianceModuleConfig = {
  title: 'Laudos NR-12',
  subtitle: 'Controle laudos, inspeções e adequações de segurança em máquinas e equipamentos com rastreabilidade técnica.',
  collectionName: 'nr12Reports',
  storageFolder: 'laudos-nr12',
  documentLabel: 'laudo NR-12',
  newButtonLabel: 'Novo laudo NR-12',
  emptyMessage: 'Nenhum laudo NR-12 cadastrado.',
  statusOptions: statusPadrao,
  guidance: [
    'Use este módulo para registrar máquinas, riscos, proteções, intertravamentos e recomendações de adequação.',
    'Inclua evidências antes/depois e relacione a não conformidade ao plano de ação quando necessário.',
    'Laudos NR-12 são complementares ao PIE quando há interação entre instalações elétricas, máquinas e comandos de segurança.',
  ],
  referenceItems: [
    'Identificação da máquina/equipamento e setor.',
    'Riscos identificados, dispositivos de segurança e proteções existentes.',
    'Recomendações técnicas, prioridade e prazo de adequação.',
  ],
  fields: [
    { name: 'maquina', label: 'Máquina / equipamento', required: true, placeholder: 'Ex: Impressora Flexo Tech Millennium 4' },
    { name: 'tag', label: 'Tag / identificação', placeholder: 'Ex: MPFF-04' },
    { name: 'setor', label: 'Setor', placeholder: 'Ex: Impressão' },
    { name: 'fabricanteModelo', label: 'Fabricante / modelo', placeholder: 'Ex: Fabricante, modelo e ano' },
    {
      name: 'tipoRisco',
      label: 'Tipo de risco principal',
      type: 'select',
      options: [
        { label: 'Esmagamento', value: 'esmagamento' },
        { label: 'Corte / amputação', value: 'corte-amputacao' },
        { label: 'Choque elétrico', value: 'choque-eletrico' },
        { label: 'Arraste / aprisionamento', value: 'arraste-aprisionamento' },
        { label: 'Queimadura / térmico', value: 'termico' },
        { label: 'Outro', value: 'outro' },
      ],
    },
    { name: 'prioridade', label: 'Prioridade', type: 'select', options: [
      { label: 'Alta', value: 'alta' },
      { label: 'Média', value: 'media' },
      { label: 'Baixa', value: 'baixa' },
    ]},
    { name: 'naoConformidades', label: 'Não conformidades', type: 'textarea', colSpan: 'full' },
    { name: 'recomendacoes', label: 'Recomendações técnicas', type: 'textarea', colSpan: 'full' },
  ],
};

export const documentosObrigatoriosNR10Config: ComplianceModuleConfig = {
  title: 'Documentos Obrigatórios NR-10',
  subtitle: 'Centralize os documentos essenciais do Prontuário de Instalações Elétricas e acompanhe pendências de atualização.',
  collectionName: 'nr10Documents',
  storageFolder: 'documentos-obrigatorios-nr10',
  documentLabel: 'documento NR-10',
  newButtonLabel: 'Novo documento',
  emptyMessage: 'Nenhum documento obrigatório NR-10 cadastrado.',
  statusOptions: statusDocumento,
  guidance: [
    'Use este módulo como índice técnico do prontuário, com validade, responsável e anexo de cada documento.',
    'Classifique os documentos por categoria para facilitar auditorias, fiscalizações e acesso do cliente.',
  ],
  referenceItems: [
    'Diagramas unifilares atualizados e documentação do sistema de aterramento.',
    'Relatórios de inspeções, medições, testes, recomendações e cronogramas.',
    'Especificação de EPI, EPC, ferramental e certificações aplicáveis.',
    'Documentação de trabalhadores autorizados, qualificados, capacitados e habilitados.',
  ],
  fields: [
    { name: 'titulo', label: 'Nome do documento', required: true, placeholder: 'Ex: Diagrama unifilar geral atualizado' },
    { name: 'categoria', label: 'Categoria', type: 'select', required: true, options: [
      { label: 'Esquema unifilar', value: 'esquema-unifilar' },
      { label: 'Relatório técnico', value: 'relatorio-tecnico' },
      { label: 'Procedimento', value: 'procedimento' },
      { label: 'EPI/EPC/Ferramental', value: 'epi-epc-ferramental' },
      { label: 'Treinamento / autorização', value: 'treinamento-autorizacao' },
      { label: 'SPDA / aterramento', value: 'spda-aterramento' },
      { label: 'Áreas classificadas', value: 'areas-classificadas' },
      { label: 'Outro', value: 'outro' },
    ]},
    { name: 'responsavel', label: 'Responsável pelo documento', placeholder: 'Nome ou setor responsável' },
    { name: 'validade', label: 'Validade / próxima revisão', type: 'date' },
    { name: 'descricao', label: 'Descrição / observação', type: 'textarea', colSpan: 'full' },
  ],
};

export const epiEpcFerramentalConfig: ComplianceModuleConfig = {
  title: 'EPI / EPC / Ferramental',
  subtitle: 'Controle equipamentos de proteção, ferramentas isoladas, certificados, CA, validade e ensaios aplicáveis.',
  collectionName: 'ppeTools',
  storageFolder: 'epi-epc-ferramental',
  documentLabel: 'registro de EPI/EPC/ferramental',
  newButtonLabel: 'Novo registro',
  emptyMessage: 'Nenhum EPI, EPC ou ferramental cadastrado.',
  statusOptions: statusDocumento,
  guidance: [
    'Registre certificados, CA, laudos de isolação, validade e localização dos equipamentos.',
    'Use o status vencido para itens fora do prazo e direcione a correção para o plano de ação.',
  ],
  referenceItems: [
    'Luvas isolantes, mangas, tapetes isolantes, varas de manobra e ferramentas isoladas.',
    'EPCs aplicáveis como barreiras, sinalização, bloqueio, aterramento temporário e detector de tensão.',
  ],
  fields: [
    { name: 'nome', label: 'Equipamento / ferramenta', required: true, placeholder: 'Ex: Luva isolante classe 00' },
    { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: [
      { label: 'EPI', value: 'epi' },
      { label: 'EPC', value: 'epc' },
      { label: 'Ferramental isolado', value: 'ferramental-isolado' },
      { label: 'Instrumento de medição', value: 'instrumento-medicao' },
    ]},
    { name: 'caCertificado', label: 'CA / certificado / patrimônio', placeholder: 'Número do CA, certificado ou patrimônio' },
    { name: 'classe', label: 'Classe / tensão / categoria', placeholder: 'Ex: Classe 0, 1 kV, CAT III 600 V' },
    { name: 'validade', label: 'Validade', type: 'date' },
    { name: 'localizacao', label: 'Localização', placeholder: 'Ex: Almoxarifado, sala elétrica' },
    { name: 'observacoes', label: 'Observações e recomendações', type: 'textarea', colSpan: 'full' },
  ],
};

export const procedimentosNR10Config: ComplianceModuleConfig = {
  title: 'Procedimentos NR-10',
  subtitle: 'Organize POP, APR, PT, LOTO, instruções de trabalho, emergência e rotinas de segurança elétrica.',
  collectionName: 'procedures',
  storageFolder: 'procedimentos-nr10',
  documentLabel: 'procedimento NR-10',
  newButtonLabel: 'Novo procedimento',
  emptyMessage: 'Nenhum procedimento NR-10 cadastrado.',
  statusOptions: statusDocumento,
  guidance: [
    'Mantenha procedimentos atualizados, revisados e vinculados às atividades de risco elétrico.',
    'Inclua versão, responsável, periodicidade de revisão e arquivo assinado/aprovado.',
  ],
  referenceItems: [
    'Procedimento de desenergização, bloqueio, impedimento e reenergização.',
    'APR, Permissão de Trabalho, emergência, resgate e primeiros socorros.',
    'Instruções operacionais para painéis, salas elétricas, SEP e serviços em proximidade.',
  ],
  fields: [
    { name: 'titulo', label: 'Nome do procedimento', required: true, placeholder: 'Ex: POP de bloqueio e etiquetagem elétrica' },
    { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: [
      { label: 'POP', value: 'pop' },
      { label: 'APR', value: 'apr' },
      { label: 'PT - Permissão de Trabalho', value: 'pt' },
      { label: 'LOTO / Bloqueio e etiquetagem', value: 'loto' },
      { label: 'Emergência / resgate', value: 'emergencia' },
      { label: 'Instrução de trabalho', value: 'instrucao-trabalho' },
    ]},
    { name: 'versao', label: 'Versão', placeholder: 'Ex: Rev. 02' },
    { name: 'responsavel', label: 'Responsável pela revisão', placeholder: 'Nome ou setor' },
    { name: 'dataRevisao', label: 'Data da revisão', type: 'date' },
    { name: 'proximaRevisao', label: 'Próxima revisão', type: 'date' },
    { name: 'descricao', label: 'Descrição técnica', type: 'textarea', colSpan: 'full' },
  ],
};

export const areasClassificadasConfig: ComplianceModuleConfig = {
  title: 'Áreas Classificadas',
  subtitle: 'Controle documentação, certificações e evidências de equipamentos elétricos aplicados em áreas classificadas.',
  collectionName: 'classifiedAreas',
  storageFolder: 'areas-classificadas',
  documentLabel: 'registro de área classificada',
  newButtonLabel: 'Novo registro',
  emptyMessage: 'Nenhuma área classificada cadastrada.',
  statusOptions: statusPadrao,
  guidance: [
    'Use este módulo quando houver ambientes com atmosferas explosivas, inflamáveis ou risco de ignição.',
    'Registre classificação da área, certificados Ex, tags de equipamentos e recomendações.',
  ],
  referenceItems: [
    'Laudo/classificação de área e plantas de zoneamento.',
    'Certificados de equipamentos e materiais elétricos aplicados.',
    'Inspeções, adequações e evidências de conformidade.',
  ],
  fields: [
    { name: 'area', label: 'Área / ambiente', required: true, placeholder: 'Ex: Sala de tintas, área de solventes' },
    { name: 'classificacao', label: 'Classificação', placeholder: 'Ex: Zona 1, Zona 2, Grupo IIB, T4' },
    { name: 'equipamento', label: 'Equipamento / tag', placeholder: 'Ex: Motor EX-M01, luminária EX-L02' },
    { name: 'certificado', label: 'Certificado / conformidade', placeholder: 'Número do certificado ou norma aplicada' },
    { name: 'validade', label: 'Validade / revisão', type: 'date' },
    { name: 'observacoes', label: 'Observações e recomendações', type: 'textarea', colSpan: 'full' },
  ],
};

export const inspecoesEletricasConfig: ComplianceModuleConfig = {
  title: 'Inspeções Elétricas',
  subtitle: 'Registre inspeções de quadros, circuitos, painéis, identificação, proteções, organização e não conformidades.',
  collectionName: 'electricalInspections',
  storageFolder: 'inspecoes-eletricas',
  documentLabel: 'inspeção elétrica',
  newButtonLabel: 'Nova inspeção',
  emptyMessage: 'Nenhuma inspeção elétrica cadastrada.',
  statusOptions: statusPadrao,
  guidance: [
    'Use este módulo para inspeções periódicas, auditorias internas e levantamento de não conformidades elétricas.',
    'Quando houver risco ou pendência, registre a recomendação e encaminhe para o plano de ação.',
  ],
  referenceItems: [
    'Quadros, painéis, barramentos, disjuntores, DR, DPS, identificação e aterramento.',
    'Evidências fotográficas antes/depois e descrição técnica da correção recomendada.',
  ],
  fields: [
    { name: 'titulo', label: 'Título da inspeção', required: true, placeholder: 'Ex: Inspeção do QGBT principal' },
    { name: 'local', label: 'Local / setor', required: true, placeholder: 'Ex: Subestação, sala elétrica, produção' },
    { name: 'itemInspecionado', label: 'Item inspecionado', placeholder: 'Ex: Quadro QD-01, circuito iluminação, painel de comando' },
    { name: 'risco', label: 'Nível de risco', type: 'select', options: [
      { label: 'Baixo', value: 'baixo' },
      { label: 'Médio', value: 'medio' },
      { label: 'Alto', value: 'alto' },
      { label: 'Crítico', value: 'critico' },
    ]},
    { name: 'dataInspecao', label: 'Data da inspeção', type: 'date' },
    { name: 'responsavel', label: 'Responsável pela inspeção', placeholder: 'Nome do inspetor' },
    { name: 'naoConformidade', label: 'Não conformidade / observação', type: 'textarea', colSpan: 'full' },
    { name: 'recomendacao', label: 'Recomendação técnica', type: 'textarea', colSpan: 'full' },
  ],
};

export const relatorioTecnicoConsolidadoConfig: ComplianceModuleConfig = {
  title: 'Relatório Técnico Consolidado',
  subtitle: 'Cadastre relatórios finais, pareceres técnicos, cronogramas de adequação e documentos de entrega do prontuário.',
  collectionName: 'technicalReports',
  storageFolder: 'relatorios-tecnicos-consolidados',
  documentLabel: 'relatório técnico consolidado',
  newButtonLabel: 'Novo relatório',
  emptyMessage: 'Nenhum relatório técnico consolidado cadastrado.',
  statusOptions: statusDocumento,
  guidance: [
    'Use este módulo para o relatório final do prontuário, relatório de inspeção, parecer técnico e cronograma de adequações.',
    'O relatório consolidado deve facilitar a entrega ao cliente, auditoria, fiscalização e acompanhamento de correções.',
  ],
  referenceItems: [
    'Resumo executivo da condição da instalação elétrica.',
    'Lista de documentos avaliados, não conformidades e recomendações.',
    'Cronograma de adequações, responsáveis e prioridades.',
  ],
  fields: [
    { name: 'titulo', label: 'Título do relatório', required: true, placeholder: 'Ex: Relatório técnico do PIE - ACREPLAST' },
    { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: [
      { label: 'Relatório final do prontuário', value: 'relatorio-final-pie' },
      { label: 'Parecer técnico', value: 'parecer-tecnico' },
      { label: 'Cronograma de adequações', value: 'cronograma-adequacoes' },
      { label: 'Relatório de inspeção', value: 'relatorio-inspecao' },
    ]},
    { name: 'responsavelTecnico', label: 'Responsável técnico', placeholder: 'Nome do profissional habilitado' },
    { name: 'dataEmissao', label: 'Data de emissão', type: 'date' },
    { name: 'validadeRevisao', label: 'Validade / revisão', type: 'date' },
    { name: 'resumo', label: 'Resumo técnico', type: 'textarea', colSpan: 'full' },
  ],
};
