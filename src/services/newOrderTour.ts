// src/services/newOrderTour.ts

import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import '../styles/shepherd-theme.scss';

// Função que configura e retorna a instância do tour
export function createNewOrderTour(
  goToStep: (step: number) => void,
  isMobile: boolean = false
) {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: {
        enabled: true,
      },
      classes: 'shepherd-mj-theme',
      scrollTo: { behavior: 'smooth', block: 'center' },
    },
  });

  // Função auxiliar para botões
  const getButtons = (nextAction: () => void, backAction?: () => void) => {
    const buttons = [];
    if (backAction) {
      buttons.push({
        action: backAction,
        secondary: true,
        text: 'Voltar',
      });
    }
    buttons.push({
      action: nextAction,
      classes: 'shepherd-button-primary',
      text: 'Próximo',
    });
    return buttons;
  };

  // Definindo os passos do Tour (versão aprimorada)
  tour.addStep({
    id: 'step-1-intro',
    title: '🚀 Tour: Lançando um Novo Pedido',
    text: 'Olá! Vamos juntos aprender a lançar um pedido de forma rápida e eficiente. Este guia interativo mostrará as principais funcionalidades da tela. <br><br>A qualquer momento, você pode clicar fora do balão ou no "X" para sair.',
    buttons: getButtons(() => tour.next()),
  });

  tour.addStep({
    id: 'step-1-cliente',
    title: 'Passo 1: Identificação do Cliente',
    text: 'Tudo começa com o cliente. Comece a digitar aqui para buscar em sua carteira. <br><br> ✨ <strong>Dica:</strong> Se for um cliente novo, clique no ícone <strong>"+"</strong> ao lado para fazer um cadastro rápido, sem sair da tela.',
    attachTo: {
      element: '#tour-client-select',
      on: isMobile ? 'top' : 'bottom',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
    when: {
      show: () => goToStep(1),
    },
  });

  tour.addStep({
    id: 'step-1-vendedor',
    title: 'Seu Nome de Vendedor',
    text: 'Seu nome já é preenchido automaticamente, garantindo que a comissão e o registro de venda sejam atribuídos a você. <br><br>Após selecionar o cliente, clique em <strong>"Continuar"</strong> no final da página.',
    attachTo: {
      element: '#tour-seller-name',
      on: 'top',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-2-intro',
    title: 'Passo 2: Montagem dos Itens',
    text: 'Esta é a etapa principal, onde você adiciona e configura cada produto que o cliente deseja.',
    attachTo: {
      element: '#tour-step-2-panel',
      on: isMobile ? 'top' : 'bottom',
    },
    buttons: getButtons(() => tour.next(), () => {
      goToStep(1);
      tour.back();
    }),
    when: {
      show: () => goToStep(2),
    },
  });

  tour.addStep({
    id: 'step-2-item-list',
    title: 'Sua Lista de Compras',
    text: 'À medida que você adiciona itens, eles aparecerão aqui formando a lista do pedido. O valor total é atualizado em tempo real. Você pode clicar em um item para editá-lo ou excluí-lo.',
    attachTo: {
      element: '#tour-item-list',
      on: 'right',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-2-add-item-form',
    title: 'Configurador de Itens',
    text: 'É neste formulário que a mágica acontece. Use os campos abaixo para detalhar cada item do pedido.',
    attachTo: {
      element: '#tour-item-form',
      on: 'left',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-2-product-stamp',
    title: 'Base (Tecido) e Estampa',
    text: 'Selecione o <strong>tecido</strong> e a <strong>estampa</strong>. <br><br>🎨 <strong>Estampa Nova?</strong> Se não encontrar a estampa, clique em <i>"Cadastre uma nova estampa"</i> para fazer o upload do arquivo e dar um nome a ela. O sistema a salvará para vendas futuras.',
    attachTo: {
      element: '#tour-product-stamp-fields',
      on: 'bottom',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-2-quantity-stock',
    title: 'Quantidade e Estoque',
    text: 'Defina a quantidade (em metros ou Kg). A barra de progresso abaixo mostra o impacto no estoque atual. <br><br>⚠️ <strong>Atenção:</strong> Se a barra ficar vermelha, significa que o estoque ficará negativo e um alerta será gerado para o time de compras!',
    attachTo: {
      element: '#tour-quantity-field',
      on: 'bottom',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-2-price-override',
    title: 'Preço Negociado',
    text: 'O sistema puxa o preço de tabela do produto. Caso você tenha negociado um valor diferente com o cliente, marque esta caixa e insira o preço combinado.',
    attachTo: {
      element: '#tour-price-override',
      on: 'top',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-2-design-destination',
    title: 'Direcionamento para o Design',
    text: 'Aqui você define o status inicial do item para a equipe de design. Isso ajuda a organizar o fluxo de trabalho deles. <br><br>Ex: "Desenvolvimento" para artes novas, "Alteração" para ajustes, etc.',
    attachTo: {
      element: '#tour-design-tags',
      on: 'top',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-2-add-to-list',
    title: 'Adicionar ao Pedido',
    text: 'Após preencher todos os detalhes, clique aqui para salvar o item e adicioná-lo à lista à esquerda. Depois, você pode adicionar o próximo item!',
    attachTo: {
      element: '#tour-add-item-button',
      on: 'top',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-3-intro',
    title: 'Passo 3: Pagamento e Finalização',
    text: 'Ótimo! Itens adicionados. Agora, a última etapa: definir como o cliente irá pagar.',
    attachTo: {
      element: '#tour-step-3-panel',
      on: isMobile ? 'top' : 'bottom',
    },
    buttons: getButtons(() => tour.next(), () => {
      goToStep(2);
      tour.back();
    }),
    when: {
      show: () => goToStep(3),
    },
  });

  tour.addStep({
    id: 'step-3-payment-type',
    title: 'Condições de Pagamento',
    text: 'Selecione "À vista" ou "Parcelado". Ao escolher "Parcelado", o sistema abrirá opções para você definir o número de parcelas, o intervalo e gerar a previsão de vencimentos.',
    attachTo: {
      element: '#tour-payment-type',
      on: 'bottom',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-3-down-payment',
    title: 'Pagamento de Sinal (Entrada)',
    text: 'Caso o cliente tenha pago um sinal para confirmar o pedido, ative esta opção. Você poderá anexar o comprovante, que ficará vinculado ao pedido para conferência do financeiro.',
    attachTo: {
      element: '#tour-down-payment-switch',
      on: 'top',
    },
    buttons: getButtons(() => tour.next(), () => tour.back()),
  });

  tour.addStep({
    id: 'step-final',
    title: '🎉 Tudo Pronto para Lançar!',
    text: 'Com tudo configurado, este é o botão final. Ao clicar, o pedido é oficialmente criado e enviado para as próximas etapas (design e produção). <br><br><strong>O tour termina aqui. Boas vendas!</strong>',
    attachTo: {
      element: '#tour-submit-button',
      on: 'top',
    },
    buttons: [
      {
        action: () => {
          goToStep(1);
          tour.complete();
        },
        classes: 'shepherd-button-primary',
        text: 'Finalizar Tour',
      },
    ],
  });

  return tour;
}
