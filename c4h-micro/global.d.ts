/**
 * Global type declarations for the C4H Editor microfrontend architecture
 */

// Global window extensions for event bus and shared modules
interface Window {
    __C4H_EVENT_BUS__?: EventTarget;
    __SHELL_CONFIG__?: any;
  }
  
  // Extend React's IntrinsicElements for custom elements if needed
  declare namespace JSX {
    interface IntrinsicElements {
      // Define custom elements if you're using Web Components
      // 'my-element': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
  
  // Allow dynamic imports in TypeScript
  declare module '*';
  
  // Declare modules with generic import types for microfrontends 
  declare module 'test-app' {
    const component: React.ComponentType<any>;
    export default component;
    export function mount(props: any): { unmount: () => void };
  }
  
  declare module 'config-selector' {
    const component: React.ComponentType<any>;
    export default component;
    export function mount(props: any): { unmount: () => void };
  }
  
  declare module 'job-management' {
    const component: React.ComponentType<any>;
    export default component;
    export function mount(props: any): { unmount: () => void };
  }
  
  declare module 'yaml-editor' {
    const component: React.ComponentType<any>;
    export default component;
    export function mount(props: any): { unmount: () => void };
  }