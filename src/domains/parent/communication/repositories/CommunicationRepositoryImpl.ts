import { collection, doc, getDocs, getDoc, query, where, setDoc, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { ICommunicationRepository } from './ICommunicationRepository';
import { Thread, Message } from '../types';
import { virtualDatabase } from '../../../../foundation/sandbox/VirtualDatabase';

export class CommunicationRepositoryImpl implements ICommunicationRepository {
  private threadsCollection = 'parent_threads';
  private messagesCollection = 'parent_messages';

  async createThread(thread: Thread): Promise<Thread> {
    if (virtualDatabase.isActive()) {
      const id = await virtualDatabase.addDoc(this.threadsCollection, thread);
      return { ...thread, id };
    }
    const docRef = await addDoc(collection(db, this.threadsCollection), thread as any);
    return { ...thread, id: docRef.id };
  }

  async updateThread(threadId: string, data: Partial<Thread>): Promise<void> {
    if (virtualDatabase.isActive()) {
      await virtualDatabase.updateDoc(this.threadsCollection, threadId, data);
      return;
    }
    const ref = doc(db, this.threadsCollection, threadId);
    await updateDoc(ref, data as any);
  }

  async getThreadById(threadId: string): Promise<Thread | null> {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc(this.threadsCollection, threadId);
      if (!data) return null;
      return { id: data.id, ...data } as Thread;
    }
    const snap = await getDoc(doc(db, this.threadsCollection, threadId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Thread;
  }

  async getThreadsByParentId(parentId: string): Promise<Thread[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.threadsCollection, item => item.parentId === parentId);
      return items.map(d => ({ id: d.id, ...d } as Thread));
    }
    const q = query(
      collection(db, this.threadsCollection), 
      where('parentId', '==', parentId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Thread));
  }

  async getThreadsByTargetId(targetUserId: string): Promise<Thread[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.threadsCollection, item => item.targetUserId === targetUserId);
      return items.map(d => ({ id: d.id, ...d } as Thread));
    }
    const q = query(
      collection(db, this.threadsCollection), 
      where('targetUserId', '==', targetUserId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Thread));
  }
  
  async createMessage(message: Message): Promise<Message> {
    if (virtualDatabase.isActive()) {
      const id = await virtualDatabase.addDoc(this.messagesCollection, message);
      return { ...message, id };
    }
    const docRef = await addDoc(collection(db, this.messagesCollection), message as any);
    return { ...message, id: docRef.id };
  }

  async getMessagesByThreadId(threadId: string): Promise<Message[]> {
    if (virtualDatabase.isActive()) {
      const items = await virtualDatabase.getDocs(this.messagesCollection, item => item.threadId === threadId);
      return items.map(d => ({ id: d.id, ...d } as Message));
    }
    const q = query(
      collection(db, this.messagesCollection),
      where('threadId', '==', threadId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
  }

  async markMessagesAsRead(threadId: string, userId: string): Promise<void> {
    const msgs = await this.getMessagesByThreadId(threadId);
    for (const msg of msgs) {
      if (msg.id && !msg.readBy.includes(userId)) {
        if (virtualDatabase.isActive()) {
          await virtualDatabase.updateDoc(this.messagesCollection, msg.id, {
            readBy: [...msg.readBy, userId]
          });
        } else {
          const ref = doc(db, this.messagesCollection, msg.id);
          await updateDoc(ref, {
            readBy: [...msg.readBy, userId]
          });
        }
      }
    }
  }
}
