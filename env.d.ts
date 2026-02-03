/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface MetamodeFileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: string
  dependencies?: string[]
}

interface MetamodeDirectoryDescriptor {
  description: string
  metamode: string
}

interface MetamodeEntry {
  name: string
  version?: string
  description: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, MetamodeFileDescriptor>
  directories?: Record<string, MetamodeDirectoryDescriptor>
}

interface MetamodeTreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, MetamodeFileDescriptor>
  children?: Record<string, MetamodeTreeNode>
}

declare module 'virtual:metamode' {
  const metamode: Record<string, MetamodeEntry>
  export default metamode
}

declare module 'virtual:metamode/tree' {
  const metamodeTree: MetamodeTreeNode
  export default metamodeTree
}
