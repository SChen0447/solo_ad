declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'gif.js' {
  const GIF: any
  export default GIF
}

declare module '*.js?raw' {
  const content: string
  export default content
}

declare module 'gif.js/src/gif.worker.js?raw' {
  const content: string
  export default content
}
