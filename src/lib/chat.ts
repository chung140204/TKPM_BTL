/**
 * Rocket.Chat Integration Layer (Stub)
 * 
 * This module provides a clean interface to the Rocket.Chat REST API.
 * Currently stubbed for development — will be connected when chat server is deployed.
 * 
 * Configuration via environment variables:
 *   ROCKETCHAT_URL - Base URL of the Rocket.Chat server
 *   ROCKETCHAT_USER - Admin username
 *   ROCKETCHAT_PASSWORD - Admin password
 */

const ROCKETCHAT_URL = process.env.ROCKETCHAT_URL || 'http://localhost:3100';

interface ChatMessage {
    id: string;
    roomId: string;
    text: string;
    sender: string;
    timestamp: Date;
}

interface ChatChannel {
    id: string;
    name: string;
    type: 'direct' | 'group' | 'channel';
}

export async function sendMessage(channelId: string, text: string): Promise<ChatMessage | null> {
    console.log(`[Chat Stub] sendMessage to ${channelId}: ${text}`);
    // TODO: POST ${ROCKETCHAT_URL}/api/v1/chat.sendMessage
    return null;
}

export async function createChannel(name: string, members: string[]): Promise<ChatChannel | null> {
    console.log(`[Chat Stub] createChannel: ${name} with members: ${members.join(', ')}`);
    // TODO: POST ${ROCKETCHAT_URL}/api/v1/channels.create
    return null;
}

export async function getMessages(channelId: string, count: number = 50): Promise<ChatMessage[]> {
    console.log(`[Chat Stub] getMessages from ${channelId}, count: ${count}`);
    // TODO: GET ${ROCKETCHAT_URL}/api/v1/channels.history
    return [];
}

export async function createDirectMessage(username: string): Promise<ChatChannel | null> {
    console.log(`[Chat Stub] createDirectMessage with: ${username}`);
    // TODO: POST ${ROCKETCHAT_URL}/api/v1/im.create
    return null;
}

export function getChatUrl(): string {
    return ROCKETCHAT_URL;
}
