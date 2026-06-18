import { Variant, TemplateType } from '../types';

const getTemplateStyles = (template: TemplateType): string => {
  switch (template) {
    case TemplateType.LANDING:
      return `
        .landing-container {
          min-height: 100vh;
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
        }
        .landing-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%);
        }
        .landing-content {
          position: relative;
          z-index: 1;
          text-align: center;
          color: #ffffff;
          max-width: 800px;
          padding: 48px;
        }
      `;
    case TemplateType.REGISTER:
      return `
        .register-container {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .register-bg {
          background-size: cover;
          background-position: center;
        }
        .register-form {
          display: grid;
          place-items: center;
          background: #ffffff;
          padding: 48px;
        }
        .register-content {
          max-width: 400px;
          width: 100%;
        }
        .form-input {
          width: 100%;
          padding: 12px 16px;
          margin: 8px 0;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
        }
      `;
    case TemplateType.MODAL:
      return `
        .modal-container {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
        }
        .modal-card {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          max-width: 500px;
          width: 90%;
          display: grid;
          grid-template-rows: 250px auto;
          box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        }
        .modal-bg {
          background-size: cover;
          background-position: center;
        }
        .modal-content {
          padding: 32px;
          text-align: center;
        }
      `;
  }
};

const getTemplateBody = (variant: Variant, template: TemplateType): string => {
  switch (template) {
    case TemplateType.LANDING:
      return `
        <div class="landing-container" style="background-image: url('${variant.bgUrl}'); background-size: cover; background-position: center;">
          <div class="landing-overlay"></div>
          <div class="landing-content">
            <h1 class="variant-title" style="font-size: ${variant.fontSize}px;">${variant.title}</h1>
            <p class="variant-description" style="font-size: ${variant.fontSize * 0.4}px; margin: 24px 0 40px; opacity: 0.95;">${variant.description}</p>
            <button class="variant-btn" style="background: ${variant.btnColor};">${variant.btnText}</button>
          </div>
        </div>
      `;
    case TemplateType.REGISTER:
      return `
        <div class="register-container">
          <div class="register-bg" style="background-image: url('${variant.bgUrl}');"></div>
          <div class="register-form">
            <div class="register-content">
              <h1 class="variant-title" style="font-size: ${variant.fontSize}px; color: #1f2937;">${variant.title}</h1>
              <p class="variant-description" style="font-size: ${variant.fontSize * 0.38}px; color: #6b7280; margin: 16px 0 32px;">${variant.description}</p>
              <input type="email" class="form-input" placeholder="请输入邮箱" />
              <input type="password" class="form-input" placeholder="请输入密码" />
              <button class="variant-btn" style="background: ${variant.btnColor}; width: 100%; margin-top: 16px;">${variant.btnText}</button>
            </div>
          </div>
        </div>
      `;
    case TemplateType.MODAL:
      return `
        <div class="modal-container">
          <div class="modal-card">
            <div class="modal-bg" style="background-image: url('${variant.bgUrl}');"></div>
            <div class="modal-content">
              <h1 class="variant-title" style="font-size: ${variant.fontSize}px; color: #1f2937;">${variant.title}</h1>
              <p class="variant-description" style="font-size: ${variant.fontSize * 0.38}px; color: #6b7280; margin: 12px 0 24px;">${variant.description}</p>
              <button class="variant-btn" style="background: ${variant.btnColor};">${variant.btnText}</button>
            </div>
          </div>
        </div>
      `;
  }
};

export const generateHTML = (variant: Variant, template: TemplateType, variantName: string): string => {
  const templateStyles = getTemplateStyles(template);
  const templateBody = getTemplateBody(variant, template);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A/B测试 - ${variantName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .variant-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 700;
      line-height: 1.2;
    }
    .variant-description {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
    }
    .variant-btn {
      padding: 14px 32px;
      border: none;
      border-radius: 10px;
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .variant-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }
    .variant-btn:active {
      transform: translateY(0);
    }
    ${templateStyles}
  </style>
</head>
<body>
  ${templateBody}
</body>
</html>`;
};
