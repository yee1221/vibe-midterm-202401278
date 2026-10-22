(() => {
  'use strict';

  const STORAGE_KEYS = { menu: 'cornerCafe.menu.v1', orders: 'cornerCafe.orders.v1' };
  const SHOT_PRICE = 500;
  const initialMenu = [
    { id: 'americano', name: '아메리카노', description: '고소하고 깔끔한 시그니처 블렌드', price: 4000, stock: 12, icon: '☕', image: 'assets/americano.svg', imageAlt: '짙은 에스프레소 컬러의 아메리카노 한 잔' },
    { id: 'latte', name: '카페 라떼', description: '부드러운 우유와 에스프레소', price: 4500, stock: 10, icon: '🥛', image: 'assets/latte.svg', imageAlt: '하트 라테 아트가 그려진 따뜻한 카페 라떼' },
    { id: 'vanilla-latte', name: '바닐라 라떼', description: '은은한 바닐라 향을 더한 라떼', price: 5000, stock: 8, icon: '🍦', image: 'assets/vanilla-latte.svg', imageAlt: '얼음과 바닐라 크림이 층을 이룬 아이스 바닐라 라떼' },
    { id: 'choco-latte', name: '초코 라떼', description: '진한 초콜릿의 달콤한 한 잔', price: 4800, stock: 7, icon: '🍫', image: 'assets/choco-latte.svg', imageAlt: '휘핑크림과 초콜릿 드리즐을 얹은 초코 라떼' },
    { id: 'citron-tea', name: '레몬 에이드', description: '상큼하게 기분 전환하는 탄산 음료', price: 4500, stock: 9, icon: '🍋', image: 'assets/lemon-ade.svg', imageAlt: '레몬 슬라이스와 민트를 곁들인 레몬 에이드' }
  ];
  const menuImages = {
    americano: { src: 'assets/americano.svg', alt: '짙은 에스프레소 컬러의 아메리카노 한 잔' },
    latte: { src: 'assets/latte.svg', alt: '하트 라테 아트가 그려진 따뜻한 카페 라떼' },
    'vanilla-latte': { src: 'assets/vanilla-latte.svg', alt: '얼음과 바닐라 크림이 층을 이룬 아이스 바닐라 라떼' },
    'choco-latte': { src: 'assets/choco-latte.svg', alt: '휘핑크림과 초콜릿 드리즐을 얹은 초코 라떼' },
    'citron-tea': { src: 'assets/lemon-ade.svg', alt: '레몬 슬라이스와 민트를 곁들인 레몬 에이드' }
  };

  const elements = {
    menu: document.querySelector('#menu-list'), cart: document.querySelector('#cart-items'),
    cartCount: document.querySelector('#cart-count'), subtotal: document.querySelector('#subtotal'),
    optionTotal: document.querySelector('#option-total'), total: document.querySelector('#cart-total'),
    checkout: document.querySelector('#checkout-button'), orders: document.querySelector('#order-list'),
    inventory: document.querySelector('#inventory-list'), pending: document.querySelector('#pending-count'),
    orderSummary: document.querySelector('#order-summary'), status: document.querySelector('#status-message'),
    adminDate: document.querySelector('#admin-date')
  };

  let menu = loadMenu();
  let orders = loadOrders();
  let cart = [];
  let noticeTimer;

  function readStored(key) {
    try { return { ok: true, value: localStorage.getItem(key) }; }
    catch (error) { announce('브라우저 저장 공간에 접근할 수 없습니다. 현재 변경 내용은 새로고침 후 사라질 수 있어요.'); return { ok: false, value: null }; }
  }

  function loadMenu() {
    const stored = readStored(STORAGE_KEYS.menu);
    if (!stored.ok || stored.value === null) {
      if (stored.ok) {
        try { localStorage.setItem(STORAGE_KEYS.menu, JSON.stringify(initialMenu)); }
        catch (error) { announce('초기 메뉴를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); }
      }
      return initialMenu.map((item) => ({ ...item }));
    }
    try {
      const parsed = JSON.parse(stored.value);
      if (Array.isArray(parsed) && parsed.length === 5 && parsed.every(isValidMenu)) return parsed;
    } catch (error) { /* 아래 안내 후 안전한 초기 메뉴를 메모리에서 사용한다. */ }
    announce('저장된 메뉴 데이터 형식이 올바르지 않아 기본 메뉴를 표시합니다. 기존 데이터는 덮어쓰지 않았습니다.');
    return initialMenu.map((item) => ({ ...item }));
  }

  function isValidMenu(item) {
    return item && typeof item.id === 'string' && typeof item.name === 'string'
      && Number.isSafeInteger(item.price) && item.price >= 0
      && Number.isSafeInteger(item.stock) && item.stock >= 0;
  }

  function loadOrders() {
    const stored = readStored(STORAGE_KEYS.orders);
    if (!stored.ok || stored.value === null) {
      if (stored.ok) {
        try { localStorage.setItem(STORAGE_KEYS.orders, '[]'); }
        catch (error) { announce('주문 저장소를 초기화하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); }
      }
      return [];
    }
    try {
      const parsed = JSON.parse(stored.value);
      if (Array.isArray(parsed) && parsed.every((order) => order && typeof order.id === 'string' && Array.isArray(order.items)
        && Number.isSafeInteger(order.total) && (order.status === '접수' || order.status === '제조 완료'))) return parsed;
    } catch (error) { /* 아래 안내 후 메모리에서 빈 목록을 사용한다. */ }
    announce('저장된 주문 데이터 형식이 올바르지 않아 주문 목록을 비워 표시합니다. 기존 데이터는 덮어쓰지 않았습니다.');
    return [];
  }

  function won(amount) { return `${new Intl.NumberFormat('ko-KR').format(amount)}원`; }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }
  function announce(message) {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.classList.add('is-visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => elements.status.classList.remove('is-visible'), 3400);
  }

  function saveState(nextMenu, nextOrders) {
    let oldMenu;
    let oldOrders;
    try {
      oldMenu = localStorage.getItem(STORAGE_KEYS.menu);
      oldOrders = localStorage.getItem(STORAGE_KEYS.orders);
      localStorage.setItem(STORAGE_KEYS.menu, JSON.stringify(nextMenu));
      localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
      menu = nextMenu;
      orders = nextOrders;
      return true;
    } catch (error) {
      try {
        if (oldMenu === null || oldMenu === undefined) localStorage.removeItem(STORAGE_KEYS.menu);
        else localStorage.setItem(STORAGE_KEYS.menu, oldMenu);
        if (oldOrders === null || oldOrders === undefined) localStorage.removeItem(STORAGE_KEYS.orders);
        else localStorage.setItem(STORAGE_KEYS.orders, oldOrders);
      } catch (rollbackError) { /* 저장소 자체를 쓸 수 없어 복구도 불가능한 경우 */ }
      announce('변경 내용을 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해 주세요.');
      return false;
    }
  }

  function getCartPrice(item) {
    const unitPrice = item.menu.price + (item.shot ? SHOT_PRICE : 0);
    return { unitPrice, lineTotal: unitPrice * item.quantity };
  }

  function refreshFromStorage() {
    try {
      const storedMenu = localStorage.getItem(STORAGE_KEYS.menu);
      const storedOrders = localStorage.getItem(STORAGE_KEYS.orders);
      const latestMenu = JSON.parse(storedMenu);
      const latestOrders = JSON.parse(storedOrders);
      if (!Array.isArray(latestMenu) || latestMenu.length !== 5 || !latestMenu.every(isValidMenu)
        || !Array.isArray(latestOrders) || !latestOrders.every((order) => order && typeof order.id === 'string'
          && Array.isArray(order.items) && Number.isSafeInteger(order.total)
          && (order.status === '접수' || order.status === '제조 완료'))) {
        announce('최신 저장 데이터를 확인할 수 없어 주문을 접수하지 않았습니다. 새로고침 후 다시 시도해 주세요.');
        return false;
      }
      menu = latestMenu;
      orders = latestOrders;
      renderMenu();
      renderOrders();
      renderInventory();
      return true;
    } catch (error) {
      announce('최신 재고를 확인할 수 없어 주문을 접수하지 않았습니다. 저장 공간을 확인해 주세요.');
      return false;
    }
  }

  function renderMenu() {
    elements.menu.innerHTML = menu.map((item) => {
      const soldOut = item.stock === 0;
      const stockClass = soldOut ? 'sold-out' : item.stock <= 3 ? 'low' : '';
      const stockText = soldOut ? '품절' : `재고 ${item.stock}개`;
      const image = item.image || menuImages[item.id]?.src || '';
      const imageAlt = item.imageAlt || menuImages[item.id]?.alt || `${item.name} 음료 이미지`;
      return `<article class="menu-card">
        <div class="menu-card-top"><img class="drink-image" src="${escapeHTML(image)}" alt="${escapeHTML(imageAlt)}" loading="lazy"><span class="stock-badge ${stockClass}">${stockText}</span></div>
        <h3>${escapeHTML(item.name)}</h3><p class="menu-description">${escapeHTML(item.description || '')}</p>
        <fieldset class="option-fieldset"><legend>원하는 옵션을 선택하세요</legend>
          <label class="option-choice"><input type="checkbox" data-option="shot" data-menu-id="${escapeHTML(item.id)}" ${soldOut ? 'disabled' : ''}> 샷 추가 +500원</label>
          <label class="option-choice"><input type="checkbox" data-option="syrup" data-menu-id="${escapeHTML(item.id)}" ${soldOut ? 'disabled' : ''}> 시럽 추가 +0원</label>
        </fieldset>
        <div class="menu-card-bottom"><span class="menu-price">${won(item.price)}</span><button class="button button-add" type="button" data-action="add" data-menu-id="${escapeHTML(item.id)}" ${soldOut ? 'disabled' : ''}>${soldOut ? '품절' : '담기 +'}</button></div>
      </article>`;
    }).join('');
  }

  function renderCart() {
    if (!cart.length) {
      elements.cart.innerHTML = '<div class="empty-state"><span class="empty-icon" aria-hidden="true">🧺</span><strong>아직 담긴 메뉴가 없어요</strong><p>메뉴를 골라 담아 주세요.</p></div>';
    } else {
      elements.cart.innerHTML = cart.map((item) => {
        const { lineTotal } = getCartPrice(item);
        const options = [item.shot ? '샷 추가' : '', item.syrup ? '시럽 추가' : ''].filter(Boolean).join(' · ') || '기본 옵션';
        return `<article class="cart-item"><div class="cart-item-head"><span class="cart-item-name">${escapeHTML(item.menu.name)}</span><span class="cart-item-price">${won(lineTotal)}</span></div>
          <p class="cart-item-options">${options} · 개당 ${won(item.menu.price + (item.shot ? SHOT_PRICE : 0))}</p>
          <div class="cart-item-controls"><div class="quantity-control" aria-label="${escapeHTML(item.menu.name)} 수량 조절"><button type="button" data-action="quantity" data-delta="-1" data-cart-id="${item.id}" aria-label="수량 줄이기">−</button><span>${item.quantity}</span><button type="button" data-action="quantity" data-delta="1" data-cart-id="${item.id}" aria-label="수량 늘리기">+</button></div><button class="remove-button" type="button" data-action="remove" data-cart-id="${item.id}">삭제</button></div></article>`;
      }).join('');
    }
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const base = cart.reduce((sum, item) => sum + item.menu.price * item.quantity, 0);
    const options = cart.reduce((sum, item) => sum + (item.shot ? SHOT_PRICE * item.quantity : 0), 0);
    elements.cartCount.textContent = String(count);
    elements.subtotal.textContent = won(base);
    elements.optionTotal.textContent = won(options);
    elements.total.textContent = won(base + options);
    elements.checkout.disabled = cart.length === 0;
  }

  function renderOrders() {
    const pendingCount = orders.filter((order) => order.status === '접수').length;
    elements.pending.textContent = String(pendingCount);
    elements.orderSummary.textContent = `총 ${orders.length}건 · 제조 대기 ${pendingCount}건`;
    if (!orders.length) {
      elements.orders.innerHTML = '<div class="empty-state"><span class="empty-icon" aria-hidden="true">☕</span><strong>아직 접수된 주문이 없습니다</strong><p>고객 화면에서 첫 주문을 만들어 보세요.</p></div>';
      return;
    }
    elements.orders.innerHTML = [...orders].reverse().map((order) => {
      const date = new Date(order.createdAt);
      const time = Number.isNaN(date.getTime()) ? '시간 정보 없음' : new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
      const lines = order.items.map((item) => `<div class="order-line"><span>${escapeHTML(item.name)} <small>${escapeHTML(item.options || '기본 옵션')} · ${item.quantity}잔</small></span><strong>${won(item.total)}</strong></div>`).join('');
      const statusClass = order.status === '제조 완료' ? 'done' : '';
      const completeButton = order.status === '접수' ? `<button class="button button-complete" type="button" data-action="complete" data-order-id="${escapeHTML(order.id)}">제조 완료 처리</button>` : '<span class="section-meta">픽업 준비가 완료됐어요</span>';
      return `<article class="order-card"><div class="order-card-top"><div class="order-ident"><span class="order-number">${escapeHTML(order.id)}</span><span class="order-time">${time}</span></div><span class="order-status ${statusClass}">${escapeHTML(order.status)}</span></div><div class="order-lines">${lines}</div><div class="order-card-bottom"><span class="order-total">주문 금액　${won(order.total)}</span>${completeButton}</div></article>`;
    }).join('');
  }

  function renderInventory() {
    elements.inventory.innerHTML = menu.map((item) => `<div class="inventory-row"><span class="inventory-name">${escapeHTML(item.name)}</span><span class="inventory-price">${won(item.price)}</span><span class="inventory-stock">${item.stock === 0 ? '<strong class="sold-out-text">품절</strong>' : `재고 <strong>${item.stock}개</strong>`}</span></div>`).join('');
  }

  function render() {
    renderMenu(); renderCart(); renderOrders(); renderInventory();
  }

  function addToCart(menuId) {
    const item = menu.find((entry) => entry.id === menuId);
    if (!item || item.stock === 0) { announce('현재 주문할 수 없는 메뉴입니다.'); return; }
    const shot = Boolean(document.querySelector(`[data-option="shot"][data-menu-id="${CSS.escape(menuId)}"]`)?.checked);
    const syrup = Boolean(document.querySelector(`[data-option="syrup"][data-menu-id="${CSS.escape(menuId)}"]`)?.checked);
    const existing = cart.find((entry) => entry.menu.id === menuId && entry.shot === shot && entry.syrup === syrup);
    const queued = cart.filter((entry) => entry.menu.id === menuId).reduce((sum, entry) => sum + entry.quantity, 0);
    if (queued >= item.stock) { announce(`${item.name} 재고가 부족해 더 담을 수 없습니다.`); return; }
    if (existing) existing.quantity += 1;
    else cart.push({ id: `${menuId}-${shot ? 1 : 0}-${syrup ? 1 : 0}`, menu: { ...item }, shot, syrup, quantity: 1 });
    renderCart();
    announce(`${item.name} 메뉴를 주문 바구니에 담았습니다.`);
  }

  function adjustQuantity(cartId, delta) {
    const item = cart.find((entry) => entry.id === cartId);
    if (!item) return;
    const nextQuantity = item.quantity + delta;
    const totalForMenu = cart.filter((entry) => entry.menu.id === item.menu.id).reduce((sum, entry) => sum + entry.quantity, 0);
    const currentMenu = menu.find((entry) => entry.id === item.menu.id);
    if (nextQuantity < 1) return;
    if (delta > 0 && totalForMenu >= (currentMenu?.stock ?? 0)) { announce(`${item.menu.name} 재고는 ${currentMenu?.stock ?? 0}개입니다.`); return; }
    item.quantity = nextQuantity;
    renderCart();
  }

  function checkout() {
    if (!cart.length) return;
    if (!refreshFromStorage()) return;
    const requested = new Map();
    cart.forEach((item) => requested.set(item.menu.id, (requested.get(item.menu.id) || 0) + item.quantity));
    for (const [menuId, quantity] of requested) {
      const current = menu.find((item) => item.id === menuId);
      if (!current || current.stock < quantity) {
        announce(`${current?.name || '메뉴'} 재고가 부족합니다. 수량을 확인해 주세요.`);
        return;
      }
    }
    const createdAt = new Date().toISOString();
    const orderId = `A${createdAt.replace(/\D/g, '').slice(2, 12)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const orderItems = cart.map((item) => {
      const { lineTotal } = getCartPrice(item);
      return { id: item.menu.id, name: item.menu.name, quantity: item.quantity, options: [item.shot ? '샷 추가' : '', item.syrup ? '시럽 추가' : ''].filter(Boolean).join(' · ') || '기본 옵션', unitPrice: item.menu.price + (item.shot ? SHOT_PRICE : 0), total: lineTotal };
    });
    const total = orderItems.reduce((sum, item) => sum + item.total, 0);
    const nextMenu = menu.map((item) => ({ ...item, stock: item.stock - (requested.get(item.id) || 0) }));
    const nextOrders = [...orders, { id: orderId, createdAt, status: '접수', items: orderItems, total }];
    if (!saveState(nextMenu, nextOrders)) return;
    cart = [];
    render();
    announce(`주문 ${orderId} 접수가 완료됐습니다. 관리자 화면에서 확인할 수 있어요.`);
  }

  function completeOrder(orderId) {
    const nextOrders = orders.map((order) => order.id === orderId && order.status === '접수' ? { ...order, status: '제조 완료', completedAt: new Date().toISOString() } : order);
    if (nextOrders.every((order, index) => order === orders[index])) return;
    if (saveState(menu, nextOrders)) { renderOrders(); announce(`${orderId} 주문을 제조 완료 처리했습니다.`); }
  }

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach((tab) => {
        const selected = tab === button;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      document.querySelector('#customer-view').hidden = button.dataset.view !== 'customer';
      document.querySelector('#admin-view').hidden = button.dataset.view !== 'admin';
    });
  });

  elements.menu.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="add"]');
    if (button && !button.disabled) addToCart(button.dataset.menuId);
  });
  elements.cart.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'quantity') adjustQuantity(button.dataset.cartId, Number(button.dataset.delta));
    if (button.dataset.action === 'remove') { cart = cart.filter((item) => item.id !== button.dataset.cartId); renderCart(); }
  });
  elements.orders.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="complete"]');
    if (button) completeOrder(button.dataset.orderId);
  });
  elements.checkout.addEventListener('click', checkout);
  elements.adminDate.textContent = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
  render();
})();
