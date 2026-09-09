/// <reference types="vite/client" />
/// <reference types="element-plus/global" />

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE: string;
    readonly VITE_AI_SCREEN_SCOPE_ENABLED?: string;
  }
}

declare module 'vue' {
  interface HTMLAttributes {
    'data-comp-id'?: string;
    'data-template'?: string;
    'data-nav'?: string;
    dataCompId?: string;
    dataTemplate?: string;
    dataNav?: string;
  }
  interface GlobalComponents {
    VxeTable: (typeof import('vxe-table'))['VxeTable'];
    VxeColumn: (typeof import('vxe-table'))['VxeColumn'];
  }
}
