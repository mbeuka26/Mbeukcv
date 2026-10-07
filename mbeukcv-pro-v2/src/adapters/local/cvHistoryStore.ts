import type { CvHistoryStore } from '@/ports';
import {
  createCvHistoryEntry,
  deleteCvHistoryEntry,
  listCvHistory,
  updateCvHistoryEntry,
} from '@/services/cvHistory';

export const localCvHistoryStore: CvHistoryStore = {
  list: listCvHistory,
  create: createCvHistoryEntry,
  update: updateCvHistoryEntry,
  remove: deleteCvHistoryEntry,
};
