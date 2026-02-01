/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'virtual:metanet' {
  interface MetanetFileDescriptor {
    description: string
    tags?: string[]
    phase?: number
    status?: string
    dependencies?: string[]
  }

  interface MetanetDirectoryDescriptor {
    description: string
    metanet: string
  }

  interface MetanetEntry {
    name: string
    version?: string
    description: string
    languages?: string[]
    tags?: string[]
    files?: Record<string, MetanetFileDescriptor>
    directories?: Record<string, MetanetDirectoryDescriptor>
  }

  const metanet: Record<string, MetanetEntry>
  export default metanet
}
