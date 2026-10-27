import { DatabaseRepository } from './repo';
import { InMemoryRepository } from './mockRepo';
import { SupabaseRepository } from './supabaseRepo';
import { getSupabaseClient } from './supabase';

let activeRepo: DatabaseRepository | null = null;

export function getRepository(): DatabaseRepository {
  if (activeRepo) return activeRepo;

  const client = getSupabaseClient();
  if (client) {
    activeRepo = new SupabaseRepository(client);
  } else {
    activeRepo = new InMemoryRepository();
  }
  return activeRepo;
}

export function setTestRepository(repo: DatabaseRepository | null): void {
  activeRepo = repo;
}

export * from './repo';
export * from './mockRepo';
export * from './supabaseRepo';
