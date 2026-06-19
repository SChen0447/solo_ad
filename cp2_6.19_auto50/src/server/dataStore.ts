import { v4 as uuidv4 } from 'uuid';
import type { Experiment, Step, DataRecord, Attachment } from '../types';

class DataStore {
  private experiments: Map<string, Experiment> = new Map();
  private steps: Map<string, Step> = new Map();
  private records: Map<string, DataRecord> = new Map();
  private attachments: Map<string, Attachment> = new Map();

  constructor() {
    this.initMockData();
  }

  private initMockData(): void {
    const expId = uuidv4();
    const now = new Date().toISOString();
    const exp: Experiment = {
      id: expId,
      name: '催化剂活性评估实验',
      date: '2026-06-15',
      leader: '张研究员',
      description: '评估新型纳米催化剂在不同温度下的催化活性',
      order: 0,
      createdAt: now
    };
    this.experiments.set(expId, exp);

    const step1: Step = {
      id: uuidv4(),
      experimentId: expId,
      name: '样品制备与预处理',
      startTime: '2026-06-15T09:00:00',
      endTime: '2026-06-15T10:30:00',
      expectedResult: '获得5g纯度大于99%的催化剂样品',
      actualResult: '成功获得5.2g催化剂样品，经ICP检测纯度99.2%',
      order: 0,
      attachments: [],
      completed: true
    };
    this.steps.set(step1.id, step1);

    const step2: Step = {
      id: uuidv4(),
      experimentId: expId,
      name: '活性测试（200°C）',
      startTime: '2026-06-15T11:00:00',
      endTime: '2026-06-15T14:00:00',
      expectedResult: '转化率达到70%以上',
      actualResult: '',
      order: 1,
      attachments: [],
      completed: false
    };
    this.steps.set(step2.id, step2);

    const record1: DataRecord = {
      id: uuidv4(),
      stepId: step1.id,
      type: 'numeric',
      value: '99.2',
      timestamp: '2026-06-15T10:15:00'
    };
    this.records.set(record1.id, record1);

    const record2: DataRecord = {
      id: uuidv4(),
      stepId: step1.id,
      type: 'numeric',
      value: '5.2',
      timestamp: '2026-06-15T10:20:00'
    };
    this.records.set(record2.id, record2);
  }

  getExperiments(): Experiment[] {
    return Array.from(this.experiments.values()).sort((a, b) => a.order - b.order);
  }

  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  createExperiment(data: Omit<Experiment, 'id' | 'order' | 'createdAt'>): Experiment {
    const id = uuidv4();
    const order = this.experiments.size;
    const exp: Experiment = {
      ...data,
      id,
      order,
      createdAt: new Date().toISOString()
    };
    this.experiments.set(id, exp);
    return exp;
  }

  updateExperiment(id: string, data: Partial<Experiment>): Experiment | undefined {
    const exp = this.experiments.get(id);
    if (!exp) return undefined;
    const updated = { ...exp, ...data };
    this.experiments.set(id, updated);
    return updated;
  }

  deleteExperiment(id: string): boolean {
    const steps = this.getStepsByExperiment(id);
    steps.forEach(s => this.deleteStep(s.id));
    return this.experiments.delete(id);
  }

  reorderExperiments(ids: string[]): boolean {
    ids.forEach((id, idx) => {
      const exp = this.experiments.get(id);
      if (exp) {
        exp.order = idx;
      }
    });
    return true;
  }

  getStepsByExperiment(experimentId: string): Step[] {
    return Array.from(this.steps.values())
      .filter(s => s.experimentId === experimentId)
      .sort((a, b) => a.order - b.order);
  }

  getStep(id: string): Step | undefined {
    return this.steps.get(id);
  }

  createStep(data: Omit<Step, 'id' | 'order' | 'attachments' | 'completed'>): Step {
    const id = uuidv4();
    const existingSteps = this.getStepsByExperiment(data.experimentId);
    const order = existingSteps.length;
    const step: Step = {
      ...data,
      id,
      order,
      attachments: [],
      completed: false
    };
    this.steps.set(id, step);
    return step;
  }

  updateStep(id: string, data: Partial<Step>): Step | undefined {
    const step = this.steps.get(id);
    if (!step) return undefined;
    const updated = { ...step, ...data };
    this.steps.set(id, updated);
    return updated;
  }

  deleteStep(id: string): boolean {
    const step = this.steps.get(id);
    if (step) {
      step.attachments.forEach(a => this.attachments.delete(a.id));
    }
    const records = this.getRecordsByStep(id);
    records.forEach(r => this.records.delete(r.id));
    return this.steps.delete(id);
  }

  batchDeleteSteps(ids: string[]): boolean {
    ids.forEach(id => this.deleteStep(id));
    return true;
  }

  reorderSteps(experimentId: string, ids: string[]): boolean {
    ids.forEach((id, idx) => {
      const step = this.steps.get(id);
      if (step && step.experimentId === experimentId) {
        step.order = idx;
      }
    });
    return true;
  }

  addAttachment(stepId: string, fileData: Omit<Attachment, 'id' | 'stepId'>): Attachment | undefined {
    const step = this.steps.get(stepId);
    if (!step) return undefined;
    const attachment: Attachment = {
      ...fileData,
      id: uuidv4(),
      stepId
    };
    this.attachments.set(attachment.id, attachment);
    step.attachments.push(attachment);
    return attachment;
  }

  deleteAttachment(stepId: string, attachmentId: string): boolean {
    const step = this.steps.get(stepId);
    if (!step) return false;
    step.attachments = step.attachments.filter(a => a.id !== attachmentId);
    return this.attachments.delete(attachmentId);
  }

  getRecordsByStep(stepId: string): DataRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.stepId === stepId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  getRecord(id: string): DataRecord | undefined {
    return this.records.get(id);
  }

  createRecord(data: Omit<DataRecord, 'id' | 'timestamp'> & { timestamp?: string }): DataRecord {
    const id = uuidv4();
    const record: DataRecord = {
      ...data,
      id,
      timestamp: data.timestamp || new Date().toISOString()
    };
    this.records.set(id, record);
    return record;
  }

  updateRecord(id: string, data: Partial<DataRecord>): DataRecord | undefined {
    const record = this.records.get(id);
    if (!record) return undefined;
    const updated = { ...record, ...data };
    this.records.set(id, updated);
    return updated;
  }

  deleteRecord(id: string): boolean {
    return this.records.delete(id);
  }

  getAttachment(id: string): Attachment | undefined {
    return this.attachments.get(id);
  }
}

export const dataStore = new DataStore();
export default dataStore;
