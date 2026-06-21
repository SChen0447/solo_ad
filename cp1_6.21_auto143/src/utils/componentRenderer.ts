import { ComponentType, Framework, VariableOverride } from '../types';
import { generateOverrideStyles } from './variableOverride';

const frameworkCDNs: Record<Framework, string> = {
  [Framework.BOOTSTRAP]: '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">',
  [Framework.TAILWIND]: '<script src="https://cdn.tailwindcss.com"></script>',
  [Framework.BULMA]: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">'
};

function generateButtonHTML(framework: Framework): string {
  switch (framework) {
    case Framework.BOOTSTRAP:
      return `
        <div class="p-4">
          <h5 class="mb-3">按钮组件</h5>
          <button type="button" class="btn btn-primary me-2">Primary</button>
          <button type="button" class="btn btn-secondary me-2">Secondary</button>
          <button type="button" class="btn btn-success me-2">Success</button>
          <button type="button" class="btn btn-danger">Danger</button>
          <div class="mt-3">
            <button type="button" class="btn btn-outline-primary me-2">Outline</button>
            <button type="button" class="btn btn-primary btn-sm me-2">Small</button>
            <button type="button" class="btn btn-primary btn-lg">Large</button>
          </div>
        </div>
      `;
    case Framework.TAILWIND:
      return `
        <div class="p-4">
          <h5 class="mb-3 text-lg font-medium">按钮组件</h5>
          <button class="bg-[var(--tw-primary)] text-white px-4 py-2 rounded-[var(--tw-radius)] mr-2 hover:opacity-90 transition">Primary</button>
          <button class="bg-[var(--tw-secondary)] text-white px-4 py-2 rounded-[var(--tw-radius)] mr-2 hover:opacity-90 transition">Secondary</button>
          <button class="bg-[var(--tw-success)] text-white px-4 py-2 rounded-[var(--tw-radius)] mr-2 hover:opacity-90 transition">Success</button>
          <button class="bg-[var(--tw-danger)] text-white px-4 py-2 rounded-[var(--tw-radius)] hover:opacity-90 transition">Danger</button>
          <div class="mt-3">
            <button class="border-2 border-[var(--tw-primary)] text-[var(--tw-primary)] px-4 py-2 rounded-[var(--tw-radius)] mr-2 hover:bg-[var(--tw-primary)] hover:text-white transition">Outline</button>
            <button class="bg-[var(--tw-primary)] text-white px-3 py-1 text-sm rounded-[var(--tw-radius)] mr-2 hover:opacity-90 transition">Small</button>
            <button class="bg-[var(--tw-primary)] text-white px-6 py-3 text-lg rounded-[var(--tw-radius)] hover:opacity-90 transition">Large</button>
          </div>
        </div>
      `;
    case Framework.BULMA:
      return `
        <div class="p-4">
          <h5 class="mb-3 is-size-5 has-text-weight-semibold">按钮组件</h5>
          <button class="button is-primary mr-2">Primary</button>
          <button class="button is-link mr-2">Link</button>
          <button class="button is-success mr-2">Success</button>
          <button class="button is-danger">Danger</button>
          <div class="mt-3">
            <button class="button is-outlined is-primary mr-2">Outline</button>
            <button class="button is-small is-primary mr-2">Small</button>
            <button class="button is-large is-primary">Large</button>
          </div>
        </div>
      `;
    default:
      return '';
  }
}

function generateCardHTML(framework: Framework): string {
  switch (framework) {
    case Framework.BOOTSTRAP:
      return `
        <div class="p-4">
          <h5 class="mb-3">卡片组件</h5>
          <div class="card" style="width: 18rem;">
            <div class="card-body">
              <h5 class="card-title">卡片标题</h5>
              <h6 class="card-subtitle mb-2 text-body-secondary">卡片副标题</h6>
              <p class="card-text">这是一段卡片内容文本，用于展示卡片组件的基本样式和排版效果。</p>
              <a href="#" class="btn btn-primary">了解更多</a>
            </div>
          </div>
        </div>
      `;
    case Framework.TAILWIND:
      return `
        <div class="p-4">
          <h5 class="mb-3 text-lg font-medium">卡片组件</h5>
          <div class="w-72 bg-white border border-gray-200 rounded-[var(--tw-radius)] shadow-sm">
            <div class="p-4">
              <h5 class="text-lg font-semibold mb-1">卡片标题</h5>
              <h6 class="text-sm text-gray-500 mb-3">卡片副标题</h6>
              <p class="text-gray-700 text-sm mb-4">这是一段卡片内容文本，用于展示卡片组件的基本样式和排版效果。</p>
              <button class="bg-[var(--tw-primary)] text-white px-4 py-2 rounded-[var(--tw-radius)] text-sm hover:opacity-90 transition">了解更多</button>
            </div>
          </div>
        </div>
      `;
    case Framework.BULMA:
      return `
        <div class="p-4">
          <h5 class="mb-3 is-size-5 has-text-weight-semibold">卡片组件</h5>
          <div class="card" style="width: 18rem;">
            <div class="card-content">
              <div class="content">
                <p class="title is-5">卡片标题</p>
                <p class="subtitle is-6 has-text-grey">卡片副标题</p>
                <p class="is-size-6">这是一段卡片内容文本，用于展示卡片组件的基本样式和排版效果。</p>
              </div>
            </div>
            <footer class="card-footer">
              <a href="#" class="card-footer-item has-text-primary">了解更多</a>
            </footer>
          </div>
        </div>
      `;
    default:
      return '';
  }
}

function generateFormInputHTML(framework: Framework): string {
  switch (framework) {
    case Framework.BOOTSTRAP:
      return `
        <div class="p-4">
          <h5 class="mb-3">表单输入框</h5>
          <div class="mb-3">
            <label for="exampleInputEmail1" class="form-label">邮箱地址</label>
            <input type="email" class="form-control" id="exampleInputEmail1" placeholder="请输入邮箱">
            <div id="emailHelp" class="form-text">我们不会分享您的邮箱。</div>
          </div>
          <div class="mb-3">
            <label for="exampleInputPassword1" class="form-label">密码</label>
            <input type="password" class="form-control" id="exampleInputPassword1" placeholder="请输入密码">
          </div>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" id="exampleCheck1">
            <label class="form-check-label" for="exampleCheck1">记住我</label>
          </div>
          <button type="submit" class="btn btn-primary">提交</button>
        </div>
      `;
    case Framework.TAILWIND:
      return `
        <div class="p-4">
          <h5 class="mb-3 text-lg font-medium">表单输入框</h5>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
            <input type="email" class="w-full px-3 py-2 border border-gray-300 rounded-[var(--tw-radius)] focus:outline-none focus:ring-2 focus:ring-[var(--tw-primary)] focus:border-transparent" placeholder="请输入邮箱">
            <p class="mt-1 text-sm text-gray-500">我们不会分享您的邮箱。</p>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input type="password" class="w-full px-3 py-2 border border-gray-300 rounded-[var(--tw-radius)] focus:outline-none focus:ring-2 focus:ring-[var(--tw-primary)] focus:border-transparent" placeholder="请输入密码">
          </div>
          <div class="mb-4 flex items-center">
            <input type="checkbox" class="w-4 h-4 text-[var(--tw-primary)] border-gray-300 rounded focus:ring-[var(--tw-primary)]" id="remember">
            <label for="remember" class="ml-2 text-sm text-gray-700">记住我</label>
          </div>
          <button class="bg-[var(--tw-primary)] text-white px-4 py-2 rounded-[var(--tw-radius)] hover:opacity-90 transition">提交</button>
        </div>
      `;
    case Framework.BULMA:
      return `
        <div class="p-4">
          <h5 class="mb-3 is-size-5 has-text-weight-semibold">表单输入框</h5>
          <div class="field">
            <label class="label">邮箱地址</label>
            <div class="control">
              <input class="input" type="email" placeholder="请输入邮箱">
            </div>
            <p class="help">我们不会分享您的邮箱。</p>
          </div>
          <div class="field">
            <label class="label">密码</label>
            <div class="control">
              <input class="input" type="password" placeholder="请输入密码">
            </div>
          </div>
          <div class="field">
            <div class="control">
              <label class="checkbox">
                <input type="checkbox">
                记住我
              </label>
            </div>
          </div>
          <div class="field">
            <div class="control">
              <button class="button is-primary">提交</button>
            </div>
          </div>
        </div>
      `;
    default:
      return '';
  }
}

function generateNavbarHTML(framework: Framework): string {
  switch (framework) {
    case Framework.BOOTSTRAP:
      return `
        <div class="p-4">
          <h5 class="mb-3">导航栏</h5>
          <nav class="navbar navbar-expand-lg bg-body-tertiary">
            <div class="container-fluid">
              <a class="navbar-brand" href="#">Logo</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
              </button>
              <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                  <li class="nav-item">
                    <a class="nav-link active" aria-current="page" href="#">首页</a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link" href="#">功能</a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link" href="#">定价</a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link disabled">关于</a>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
        </div>
      `;
    case Framework.TAILWIND:
      return `
        <div class="p-4">
          <h5 class="mb-3 text-lg font-medium">导航栏</h5>
          <nav class="bg-gray-100">
            <div class="max-w-7xl mx-auto px-4">
              <div class="flex items-center justify-between h-14">
                <div class="flex items-center">
                  <a href="#" class="text-lg font-bold text-gray-800">Logo</a>
                  <div class="hidden md:block ml-10">
                    <div class="flex items-baseline space-x-4">
                      <a href="#" class="text-[var(--tw-primary)] px-3 py-2 rounded-md text-sm font-medium">首页</a>
                      <a href="#" class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">功能</a>
                      <a href="#" class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">定价</a>
                      <a href="#" class="text-gray-400 px-3 py-2 rounded-md text-sm font-medium cursor-not-allowed">关于</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      `;
    case Framework.BULMA:
      return `
        <div class="p-4">
          <h5 class="mb-3 is-size-5 has-text-weight-semibold">导航栏</h5>
          <nav class="navbar" role="navigation" aria-label="main navigation">
            <div class="navbar-brand">
              <a class="navbar-item has-text-weight-bold" href="#">Logo</a>
              <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
              </a>
            </div>
            <div class="navbar-menu">
              <div class="navbar-start">
                <a class="navbar-item has-text-primary has-background-primary-light">首页</a>
                <a class="navbar-item">功能</a>
                <a class="navbar-item">定价</a>
                <a class="navbar-item has-text-grey-light">关于</a>
              </div>
            </div>
          </nav>
        </div>
      `;
    default:
      return '';
  }
}

function generateAlertHTML(framework: Framework): string {
  switch (framework) {
    case Framework.BOOTSTRAP:
      return `
        <div class="p-4">
          <h5 class="mb-3">警告提示</h5>
          <div class="alert alert-primary" role="alert">
            这是一条主要提示消息！
          </div>
          <div class="alert alert-success" role="alert">
            <h4 class="alert-heading">操作成功！</h4>
            <p>您的操作已成功完成。</p>
            <hr>
            <p class="mb-0">如有疑问请联系管理员。</p>
          </div>
          <div class="alert alert-warning" role="alert">
            这是一条警告消息，请注意！
          </div>
          <div class="alert alert-danger" role="alert">
            这是一条危险错误消息！
          </div>
        </div>
      `;
    case Framework.TAILWIND:
      return `
        <div class="p-4">
          <h5 class="mb-3 text-lg font-medium">警告提示</h5>
          <div class="bg-blue-50 border-l-4 border-[var(--tw-primary)] text-blue-700 p-4 mb-3 rounded-r">
            这是一条主要提示消息！
          </div>
          <div class="bg-green-50 border-l-4 border-[var(--tw-success)] text-green-700 p-4 mb-3 rounded-r">
            <h4 class="font-bold text-lg mb-2">操作成功！</h4>
            <p class="mb-3">您的操作已成功完成。</p>
            <div class="border-t border-green-200 my-2"></div>
            <p class="text-sm">如有疑问请联系管理员。</p>
          </div>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4 mb-3 rounded-r">
            这是一条警告消息，请注意！
          </div>
          <div class="bg-red-50 border-l-4 border-[var(--tw-danger)] text-red-700 p-4 rounded-r">
            这是一条危险错误消息！
          </div>
        </div>
      `;
    case Framework.BULMA:
      return `
        <div class="p-4">
          <h5 class="mb-3 is-size-5 has-text-weight-semibold">警告提示</h5>
          <div class="notification is-info mb-3">
            这是一条主要提示消息！
          </div>
          <div class="notification is-success mb-3">
            <button class="delete"></button>
            <strong>操作成功！</strong> 您的操作已成功完成。
          </div>
          <div class="notification is-warning mb-3">
            这是一条警告消息，请注意！
          </div>
          <div class="notification is-danger">
            这是一条危险错误消息！
          </div>
        </div>
      `;
    default:
      return '';
  }
}

function generatePaginationHTML(framework: Framework): string {
  switch (framework) {
    case Framework.BOOTSTRAP:
      return `
        <div class="p-4">
          <h5 class="mb-3">分页器</h5>
          <nav aria-label="Page navigation example">
            <ul class="pagination">
              <li class="page-item"><a class="page-link" href="#">上一页</a></li>
              <li class="page-item"><a class="page-link" href="#">1</a></li>
              <li class="page-item active" aria-current="page">
                <a class="page-link" href="#">2</a>
              </li>
              <li class="page-item"><a class="page-link" href="#">3</a></li>
              <li class="page-item"><a class="page-link" href="#">4</a></li>
              <li class="page-item"><a class="page-link" href="#">5</a></li>
              <li class="page-item"><a class="page-link" href="#">下一页</a></li>
            </ul>
          </nav>
          <nav aria-label="Page navigation example" class="mt-3">
            <ul class="pagination pagination-sm">
              <li class="page-item disabled"><a class="page-link" href="#" tabindex="-1">上一页</a></li>
              <li class="page-item active"><a class="page-link" href="#">1</a></li>
              <li class="page-item"><a class="page-link" href="#">2</a></li>
              <li class="page-item"><a class="page-link" href="#">3</a></li>
              <li class="page-item"><a class="page-link" href="#">下一页</a></li>
            </ul>
          </nav>
        </div>
      `;
    case Framework.TAILWIND:
      return `
        <div class="p-4">
          <h5 class="mb-3 text-lg font-medium">分页器</h5>
          <nav class="flex">
            <ul class="flex items-center -space-x-px">
              <li>
                <a href="#" class="px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-[var(--tw-radius)] hover:bg-gray-100 hover:text-gray-700">上一页</a>
              </li>
              <li>
                <a href="#" class="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700">1</a>
              </li>
              <li>
                <a href="#" class="z-10 px-3 py-2 leading-tight text-white border border-[var(--tw-primary)] bg-[var(--tw-primary)]">2</a>
              </li>
              <li>
                <a href="#" class="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700">3</a>
              </li>
              <li>
                <a href="#" class="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700">4</a>
              </li>
              <li>
                <a href="#" class="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700">5</a>
              </li>
              <li>
                <a href="#" class="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-[var(--tw-radius)] hover:bg-gray-100 hover:text-gray-700">下一页</a>
              </li>
            </ul>
          </nav>
          <nav class="flex mt-3">
            <ul class="flex items-center -space-x-px text-sm">
              <li>
                <a href="#" class="px-2 py-1 ml-0 text-gray-400 bg-white border border-gray-300 rounded-l-[var(--tw-radius)] cursor-not-allowed">上一页</a>
              </li>
              <li>
                <a href="#" class="z-10 px-2 py-1 text-white border border-[var(--tw-primary)] bg-[var(--tw-primary)]">1</a>
              </li>
              <li>
                <a href="#" class="px-2 py-1 text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700">2</a>
              </li>
              <li>
                <a href="#" class="px-2 py-1 text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700">3</a>
              </li>
              <li>
                <a href="#" class="px-2 py-1 text-gray-500 bg-white border border-gray-300 rounded-r-[var(--tw-radius)] hover:bg-gray-100 hover:text-gray-700">下一页</a>
              </li>
            </ul>
          </nav>
        </div>
      `;
    case Framework.BULMA:
      return `
        <div class="p-4">
          <h5 class="mb-3 is-size-5 has-text-weight-semibold">分页器</h5>
          <nav class="pagination" role="navigation" aria-label="pagination">
            <a class="pagination-previous">上一页</a>
            <a class="pagination-next">下一页</a>
            <ul class="pagination-list">
              <li><a class="pagination-link" aria-label="Goto page 1">1</a></li>
              <li><span class="pagination-ellipsis">&hellip;</span></li>
              <li><a class="pagination-link" aria-label="Goto page 45">45</a></li>
              <li><a class="pagination-link is-current" aria-label="Page 46" aria-current="page">46</a></li>
              <li><a class="pagination-link" aria-label="Goto page 47">47</a></li>
              <li><span class="pagination-ellipsis">&hellip;</span></li>
              <li><a class="pagination-link" aria-label="Goto page 86">86</a></li>
            </ul>
          </nav>
          <nav class="pagination is-small mt-3" role="navigation" aria-label="pagination">
            <a class="pagination-previous is-disabled">上一页</a>
            <a class="pagination-next">下一页</a>
            <ul class="pagination-list">
              <li><a class="pagination-link is-current">1</a></li>
              <li><a class="pagination-link">2</a></li>
              <li><a class="pagination-link">3</a></li>
            </ul>
          </nav>
        </div>
      `;
    default:
      return '';
  }
}

const componentRenderers: Record<ComponentType, (framework: Framework) => string> = {
  [ComponentType.BUTTON]: generateButtonHTML,
  [ComponentType.CARD]: generateCardHTML,
  [ComponentType.FORM_INPUT]: generateFormInputHTML,
  [ComponentType.NAVBAR]: generateNavbarHTML,
  [ComponentType.ALERT]: generateAlertHTML,
  [ComponentType.PAGINATION]: generatePaginationHTML
};

export function renderComponent(
  componentType: ComponentType,
  framework: Framework,
  overrides: VariableOverride = {}
): string {
  const renderer = componentRenderers[componentType];
  if (!renderer) {
    return '<p>Unknown component type</p>';
  }

  const content = renderer(framework);
  const overrideStyles = generateOverrideStyles(framework, overrides);
  const cdn = frameworkCDNs[framework];

  const additionalStyles = getFrameworkAdditionalStyles(framework);

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${cdn}
        <style>
          ${overrideStyles}
          ${additionalStyles}
          body {
            margin: 0;
            padding: 0;
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;
}

function getFrameworkAdditionalStyles(framework: Framework): string {
  switch (framework) {
    case Framework.BOOTSTRAP:
      return `
        .btn {
          transition: all 0.2s ease;
        }
        .btn:active {
          transform: scale(0.95);
        }
      `;
    case Framework.TAILWIND:
      return `
        button {
          transition: all 0.2s ease;
        }
        button:active {
          transform: scale(0.95);
        }
      `;
    case Framework.BULMA:
      return `
        .button {
          transition: all 0.2s ease;
        }
        .button:active {
          transform: scale(0.95);
        }
        :root {
          --bulma-primary-h: 171deg;
          --bulma-primary-s: 100%;
          --bulma-primary-l: 41%;
          --bulma-info-h: 204deg;
          --bulma-info-s: 86%;
          --bulma-info-l: 54%;
          --bulma-success-h: 153deg;
          --bulma-success-s: 55%;
          --bulma-success-l: 50%;
          --bulma-warning-h: 44deg;
          --bulma-warning-s: 100%;
          --bulma-warning-l: 63%;
          --bulma-danger-h: 348deg;
          --bulma-danger-s: 90%;
          --bulma-danger-l: 61%;
          --bulma-link-h: 229deg;
          --bulma-link-s: 56%;
          --bulma-link-l: 57%;
          --bulma-radius: var(--bulma-radius, 0.25rem);
        }
        .button.is-primary {
          background-color: var(--bulma-primary, #00d1b2);
          border-color: transparent;
          color: #fff;
        }
        .button.is-link {
          background-color: var(--bulma-link, #485fc7);
          border-color: transparent;
          color: #fff;
        }
        .button.is-success {
          background-color: var(--bulma-success, #48c78e);
          border-color: transparent;
          color: #fff;
        }
        .button.is-danger {
          background-color: var(--bulma-danger, #f14668);
          border-color: transparent;
          color: #fff;
        }
        .button.is-info {
          background-color: var(--bulma-info, #3e8ed0);
          border-color: transparent;
          color: #fff;
        }
        .button.is-warning {
          background-color: var(--bulma-warning, #ffe08a);
          border-color: transparent;
          color: rgba(0, 0, 0, 0.7);
        }
        .notification.is-info {
          background-color: var(--bulma-info, #3e8ed0);
          color: #fff;
        }
        .notification.is-success {
          background-color: var(--bulma-success, #48c78e);
          color: #fff;
        }
        .notification.is-warning {
          background-color: var(--bulma-warning, #ffe08a);
          color: rgba(0, 0, 0, 0.7);
        }
        .notification.is-danger {
          background-color: var(--bulma-danger, #f14668);
          color: #fff;
        }
        .has-text-primary {
          color: var(--bulma-primary, #00d1b2) !important;
        }
        .has-background-primary-light {
          background-color: hsl(var(--bulma-primary-h, 171deg), var(--bulma-primary-s, 100%), 96%) !important;
        }
        .pagination-link.is-current {
          background-color: var(--bulma-primary, #00d1b2);
          border-color: var(--bulma-primary, #00d1b2);
          color: #fff;
        }
      `;
    default:
      return '';
  }
}

export function getFrameworkName(framework: Framework): string {
  const names: Record<Framework, string> = {
    [Framework.BOOTSTRAP]: 'Bootstrap',
    [Framework.TAILWIND]: 'Tailwind',
    [Framework.BULMA]: 'Bulma'
  };
  return names[framework];
}
