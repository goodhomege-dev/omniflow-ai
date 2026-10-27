/**
 * OmniFlow AI — Universal Multi-Channel Website Widget
 * Version: 1.0
 * 
 * Embed this widget on ANY website (WordPress, Shopify, Webflow, Custom HTML):
 * <script 
 *   src="https://your-domain.com/chat-widget.js" 
 *   data-whatsapp="9955XXXXXXXX" 
 *   data-messenger="YOUR_PAGE_NAME" 
 *   data-telegram="YOUR_BOT_USERNAME"
 *   data-brand="ჩემი მაღაზია"
 *   data-color="#4f46e5">
 * </script>
 */
(function() {
  if (window.__OMNIFLOW_WIDGET_LOADED__) return;
  window.__OMNIFLOW_WIDGET_LOADED__ = true;

  // 1. Read configuration from script tag
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const whatsapp = currentScript?.getAttribute('data-whatsapp') || '';
  const messenger = currentScript?.getAttribute('data-messenger') || '';
  const telegram = currentScript?.getAttribute('data-telegram') || '';
  const brand = currentScript?.getAttribute('data-brand') || 'OmniFlow AI';
  const color = currentScript?.getAttribute('data-color') || '#4f46e5';

  // 2. Inject Styles
  const style = document.createElement('style');
  style.textContent = `
    .omniflow-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .omniflow-toggle-btn {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background: ${color};
      color: #ffffff;
      border: none;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;
    }
    .omniflow-toggle-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 15px 30px rgba(0,0,0,0.3);
    }
    .omniflow-toggle-btn svg {
      width: 28px;
      height: 28px;
      fill: currentColor;
      transition: transform 0.3s ease;
    }
    .omniflow-popup {
      position: absolute;
      bottom: 75px;
      right: 0;
      width: 320px;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 15px 40px rgba(0,0,0,0.18);
      border: 1px solid rgba(0,0,0,0.06);
      overflow: hidden;
      transform-origin: bottom right;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: none;
      flex-direction: column;
    }
    .omniflow-popup.open {
      display: flex;
      animation: omniflow-fade-in 0.25s ease forwards;
    }
    @keyframes omniflow-fade-in {
      from { opacity: 0; transform: translateY(12px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .omniflow-header {
      background: ${color};
      color: #ffffff;
      padding: 18px 20px;
    }
    .omniflow-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
    }
    .omniflow-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      opacity: 0.9;
      margin-top: 4px;
    }
    .omniflow-status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 4px;
    }
    .omniflow-body {
      padding: 16px 20px;
      background: #f9fafb;
    }
    .omniflow-intro {
      font-size: 13px;
      color: #4b5563;
      margin-bottom: 14px;
      line-height: 1.4;
    }
    .omniflow-channel-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      margin-bottom: 8px;
      text-decoration: none;
      color: #1f2937;
      font-size: 14px;
      font-weight: 600;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      transition: all 0.2s ease;
    }
    .omniflow-channel-btn:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
      transform: translateY(-1px);
    }
    .omniflow-channel-icon {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
    }
    .omniflow-icon-wa { background: #25D366; }
    .omniflow-icon-fb { background: #0084FF; }
    .omniflow-icon-tg { background: #0088cc; }
    .omniflow-footer {
      padding: 8px 16px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      background: #ffffff;
      border-top: 1px solid #f3f4f6;
    }
  `;
  document.head.appendChild(style);

  // 3. Create Widget DOM
  const container = document.createElement('div');
  container.className = 'omniflow-widget-container';

  let channelLinks = '';

  if (whatsapp) {
    const cleanWa = whatsapp.replace(/[^0-9]/g, '');
    channelLinks += `
      <a href="https://wa.me/${cleanWa}?text=${encodeURIComponent('გამარჯობა, მაინტერესებს პროდუქცია')}" target="_blank" rel="noopener" class="omniflow-channel-btn">
        <div class="omniflow-channel-icon omniflow-icon-wa">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.115-.515-1.748-.724-2.883-2.502-2.97-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
        </div>
        <div>
          <div>WhatsApp</div>
          <small style="font-size:11px; color:#6b7280; font-weight:normal;">პირდაპირი საუბარი</small>
        </div>
      </a>
    `;
  }

  if (messenger) {
    channelLinks += `
      <a href="https://m.me/${messenger}" target="_blank" rel="noopener" class="omniflow-channel-btn">
        <div class="omniflow-channel-icon omniflow-icon-fb">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.514 3.734 7.208V22l3.39-1.86c.905.251 1.87.387 2.876.387 5.523 0 10-4.145 10-9.269C22 6.145 17.523 2 12 2zm1.066 12.443l-2.583-2.756-5.042 2.756 5.545-5.889 2.646 2.756 4.979-2.756-5.545 5.889z"/></svg>
        </div>
        <div>
          <div>Messenger</div>
          <small style="font-size:11px; color:#6b7280; font-weight:normal;">Facebook კონსულტანტი</small>
        </div>
      </a>
    `;
  }

  if (telegram) {
    const cleanTg = telegram.replace(/^@/, '');
    channelLinks += `
      <a href="https://t.me/${cleanTg}" target="_blank" rel="noopener" class="omniflow-channel-btn">
        <div class="omniflow-channel-icon omniflow-icon-tg">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
        </div>
        <div>
          <div>Telegram Bot</div>
          <small style="font-size:11px; color:#6b7280; font-weight:normal;">სწრაფი AI ბოტი</small>
        </div>
      </a>
    `;
  }

  if (!channelLinks) {
    channelLinks = '<p style="font-size:13px; color:#666;">არხები მითითებული არ არის.</p>';
  }

  container.innerHTML = `
    <div class="omniflow-popup" id="omniflow-popup">
      <div class="omniflow-header">
        <h4>${brand}</h4>
        <div class="omniflow-status">
          <span class="omniflow-status-dot"></span>
          <span>AI კონსულტანტი ონლაინშია</span>
        </div>
      </div>
      <div class="omniflow-body">
        <div class="omniflow-intro">გამარჯობა! 👋 რით შემიძლია დაგეხმაროთ? აირჩიეთ სასურველი მესენჯერი:</div>
        ${channelLinks}
      </div>
      <div class="omniflow-footer">Powered by OmniFlow AI</div>
    </div>
    <button class="omniflow-toggle-btn" id="omniflow-toggle-btn" aria-label="Open Chat">
      <svg id="omniflow-icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      <svg id="omniflow-icon-close" viewBox="0 0 24 24" style="display:none;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
  `;

  document.body.appendChild(container);

  const toggleBtn = document.getElementById('omniflow-toggle-btn');
  const popup = document.getElementById('omniflow-popup');
  const chatIcon = document.getElementById('omniflow-icon-chat');
  const closeIcon = document.getElementById('omniflow-icon-close');

  toggleBtn.addEventListener('click', function() {
    const isOpen = popup.classList.toggle('open');
    if (isOpen) {
      chatIcon.style.display = 'none';
      closeIcon.style.display = 'block';
    } else {
      chatIcon.style.display = 'block';
      closeIcon.style.display = 'none';
    }
  });
})();
