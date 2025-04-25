/**
 * Type definitions for iframe-based communication in microfrontend architecture.
 * Defines the message structure for postMessage communication between
 * iframe-hosted MFEs and the shell application.
 */

export interface IframeMessage {
  /**
   * The type of message or event (corresponds to Event Bus event types)
   */
  type: string;
  /**
   * The payload data specific to the message type
   */
  payload: any;
  /**
   * Unique identifier of the sender (e.g., 'chat-client', 'analytics-dashboard')
   */
  source: string;
}