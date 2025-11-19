/**
 * WebSocket Room Management
 * Handles Socket.IO room management, user presence, and broadcasting
 */

import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from './middleware/auth';
import { createLogger } from '../../utils/logger';

const logger = createLogger({ level: 'info' });

export interface RoomMember {
  socketId: string;
  userId?: string;
  username?: string;
  joinedAt: Date;
}

export interface RoomInfo {
  name: string;
  members: RoomMember[];
  memberCount: number;
}

/**
 * Room Manager for WebSocket namespaces
 * Provides utilities for managing Socket.IO rooms and broadcasting
 */
export class RoomManager {
  private io: Server;
  private roomMembers: Map<string, Map<string, RoomMember>>;

  constructor(io: Server) {
    this.io = io;
    this.roomMembers = new Map();
  }

  /**
   * Join a socket to a room
   */
  async joinRoom(socket: AuthenticatedSocket, roomName: string): Promise<void> {
    await socket.join(roomName);

    const member: RoomMember = {
      socketId: socket.id,
      userId: socket.user?.id,
      username: socket.user?.username,
      joinedAt: new Date(),
    };

    if (!this.roomMembers.has(roomName)) {
      this.roomMembers.set(roomName, new Map());
    }

    this.roomMembers.get(roomName)?.set(socket.id, member);

    logger.info(
      `Socket ${socket.id} (${socket.user?.username || 'anonymous'}) joined room: ${roomName}`
    );

    // Broadcast to room that a new member joined
    socket.to(roomName).emit('room:memberJoined', {
      room: roomName,
      member: {
        socketId: socket.id,
        username: socket.user?.username,
      },
    });
  }

  /**
   * Leave a socket from a room
   */
  async leaveRoom(socket: AuthenticatedSocket, roomName: string): Promise<void> {
    await socket.leave(roomName);

    const roomMap = this.roomMembers.get(roomName);
    if (roomMap) {
      roomMap.delete(socket.id);
      if (roomMap.size === 0) {
        this.roomMembers.delete(roomName);
      }
    }

    logger.info(
      `Socket ${socket.id} (${socket.user?.username || 'anonymous'}) left room: ${roomName}`
    );

    // Broadcast to room that a member left
    socket.to(roomName).emit('room:memberLeft', {
      room: roomName,
      member: {
        socketId: socket.id,
        username: socket.user?.username,
      },
    });
  }

  /**
   * Leave all rooms for a socket
   */
  async leaveAllRooms(socket: AuthenticatedSocket): Promise<void> {
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);

    for (const room of rooms) {
      await this.leaveRoom(socket, room);
    }
  }

  /**
   * Get all members in a room
   */
  getRoomMembers(roomName: string): RoomMember[] {
    const roomMap = this.roomMembers.get(roomName);
    return roomMap ? Array.from(roomMap.values()) : [];
  }

  /**
   * Get room information
   */
  getRoomInfo(roomName: string): RoomInfo {
    const members = this.getRoomMembers(roomName);
    return {
      name: roomName,
      members,
      memberCount: members.length,
    };
  }

  /**
   * Get all rooms
   */
  getAllRooms(): string[] {
    return Array.from(this.roomMembers.keys());
  }

  /**
   * Check if a socket is in a room
   */
  isInRoom(socket: Socket, roomName: string): boolean {
    return socket.rooms.has(roomName);
  }

  /**
   * Get all rooms a socket is in
   */
  getSocketRooms(socket: Socket): string[] {
    return Array.from(socket.rooms).filter((room) => room !== socket.id);
  }

  /**
   * Broadcast to a room
   */
  broadcastToRoom(roomName: string, event: string, data: unknown): void {
    this.io.to(roomName).emit(event, data);
    logger.debug(`Broadcast to room ${roomName}: ${event}`);
  }

  /**
   * Broadcast to all rooms except sender
   */
  broadcastToRoomExcept(
    roomName: string,
    excludeSocketId: string,
    event: string,
    data: unknown
  ): void {
    this.io.to(roomName).except(excludeSocketId).emit(event, data);
    logger.debug(`Broadcast to room ${roomName} (except ${excludeSocketId}): ${event}`);
  }

  /**
   * Count members in a room
   */
  getRoomMemberCount(roomName: string): number {
    return this.roomMembers.get(roomName)?.size || 0;
  }

  /**
   * Check if a room exists and has members
   */
  roomExists(roomName: string): boolean {
    return this.roomMembers.has(roomName) && this.roomMembers.get(roomName)!.size > 0;
  }

  /**
   * Get all authenticated users in a room
   */
  getAuthenticatedMembers(roomName: string): RoomMember[] {
    return this.getRoomMembers(roomName).filter((member) => member.userId);
  }

  /**
   * Get all anonymous members in a room
   */
  getAnonymousMembers(roomName: string): RoomMember[] {
    return this.getRoomMembers(roomName).filter((member) => !member.userId);
  }

  /**
   * Cleanup tracking for a disconnected socket
   */
  cleanupSocket(socketId: string): void {
    for (const [roomName, roomMap] of this.roomMembers.entries()) {
      if (roomMap.has(socketId)) {
        roomMap.delete(socketId);
        logger.debug(`Cleaned up socket ${socketId} from room ${roomName}`);
      }

      // Remove empty rooms
      if (roomMap.size === 0) {
        this.roomMembers.delete(roomName);
        logger.debug(`Removed empty room: ${roomName}`);
      }
    }
  }

  /**
   * Get statistics about all rooms
   */
  getStatistics(): {
    totalRooms: number;
    totalMembers: number;
    authenticatedMembers: number;
    anonymousMembers: number;
    rooms: Array<{ name: string; memberCount: number }>;
  } {
    let totalMembers = 0;
    let authenticatedMembers = 0;
    let anonymousMembers = 0;
    const rooms: Array<{ name: string; memberCount: number }> = [];

    for (const [roomName, roomMap] of this.roomMembers.entries()) {
      const memberCount = roomMap.size;
      totalMembers += memberCount;

      for (const member of roomMap.values()) {
        if (member.userId) {
          authenticatedMembers++;
        } else {
          anonymousMembers++;
        }
      }

      rooms.push({ name: roomName, memberCount });
    }

    return {
      totalRooms: this.roomMembers.size,
      totalMembers,
      authenticatedMembers,
      anonymousMembers,
      rooms: rooms.sort((a, b) => b.memberCount - a.memberCount),
    };
  }
}

/**
 * Create a new RoomManager instance
 */
export function createRoomManager(io: Server): RoomManager {
  return new RoomManager(io);
}
