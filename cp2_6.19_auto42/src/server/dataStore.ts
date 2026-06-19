import { v4 as uuidv4 } from 'uuid';

export interface Experiment {
  id: string;
  name: string;
  date: string;
  leader: string;
  description: string;
  createdAt: string;
}

export interface Step {
  id: string;
  experimentId: string;
  name: string;
  startTime: string;
  endTime: string;
  expectedResult: string;
  actualResult: string;
  attachments: Attachment[];
  order: number;
  completed: boolean;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  path: string;
}

export type DataType = 'numeric' | 'text' | 'boolean' | 'enum';

export interface DataRecord {
  id: string;
  stepId: string;
  type: DataType;
  label: string;
  value: string;
  enumOptions?: string[];
  recordedAt: string;
}

class DataStore {
  private experiments: Map<string, Experiment> = new Map();
  private steps: Map<string, Step> = new Map();
  private dataRecords: Map<string, DataRecord> = new Map();

  createExperiment(data: Omit<Experiment, 'id' | 'createdAt'>): Experiment {
    const experiment: Experiment = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  updateExperiment(id: string, data: Partial<Experiment>): Experiment | undefined {
    const existing = this.experiments.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id: existing.id };
    this.experiments.set(id, updated);
    return updated;
  }

  deleteExperiment(id: string): boolean {
    const steps = this.getStepsByExperiment(id);
    steps.forEach((step) => {
      this.getRecordsByStep(step.id).forEach((r) => this.dataRecords.delete(r.id));
      this.steps.delete(step.id);
    });
    return this.experiments.delete(id);
  }

  createStep(data: Omit<Step, 'id' | 'order' | 'completed' | 'attachments'>): Step {
    const existingSteps = this.getStepsByExperiment(data.experimentId);
    const step: Step = {
      id: uuidv4(),
      ...data,
      order: existingSteps.length,
      completed: false,
      attachments: [],
    };
    this.steps.set(step.id, step);
    return step;
  }

  getStep(id: string): Step | undefined {
    return this.steps.get(id);
  }

  getStepsByExperiment(experimentId: string): Step[] {
    return Array.from(this.steps.values())
      .filter((s) => s.experimentId === experimentId)
      .sort((a, b) => a.order - b.order);
  }

  updateStep(id: string, data: Partial<Step>): Step | undefined {
    const existing = this.steps.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id: existing.id };
    this.steps.set(id, updated);
    return updated;
  }

  deleteStep(id: string): boolean {
    this.getRecordsByStep(id).forEach((r) => this.dataRecords.delete(r.id));
    return this.steps.delete(id);
  }

  deleteSteps(ids: string[]): number {
    let count = 0;
    ids.forEach((id) => {
      if (this.deleteStep(id)) count++;
    });
    return count;
  }

  reorderSteps(experimentId: string, stepIds: string[]): Step[] {
    stepIds.forEach((id, index) => {
      const step = this.steps.get(id);
      if (step && step.experimentId === experimentId) {
        step.order = index;
        this.steps.set(id, step);
      }
    });
    return this.getStepsByExperiment(experimentId);
  }

  addAttachment(stepId: string, file: Attachment): Step | undefined {
    const step = this.steps.get(stepId);
    if (!step) return undefined;
    step.attachments.push(file);
    this.steps.set(stepId, step);
    return step;
  }

  createDataRecord(data: Omit<DataRecord, 'id' | 'recordedAt'>): DataRecord {
    const record: DataRecord = {
      id: uuidv4(),
      ...data,
      recordedAt: new Date().toISOString(),
    };
    this.dataRecords.set(record.id, record);
    return record;
  }

  getDataRecord(id: string): DataRecord | undefined {
    return this.dataRecords.get(id);
  }

  getRecordsByStep(stepId: string): DataRecord[] {
    return Array.from(this.dataRecords.values())
      .filter((r) => r.stepId === stepId)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  }

  getRecordsByExperiment(experimentId: string): DataRecord[] {
    const steps = this.getStepsByExperiment(experimentId);
    const records: DataRecord[] = [];
    steps.forEach((step) => {
      records.push(...this.getRecordsByStep(step.id));
    });
    return records;
  }

  updateDataRecord(id: string, data: Partial<DataRecord>): DataRecord | undefined {
    const existing = this.dataRecords.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id: existing.id };
    this.dataRecords.set(id, updated);
    return updated;
  }

  deleteDataRecord(id: string): boolean {
    return this.dataRecords.delete(id);
  }

  getExperimentProgress(experimentId: string): { total: number; completed: number } {
    const steps = this.getStepsByExperiment(experimentId);
    return {
      total: steps.length,
      completed: steps.filter((s) => s.completed).length,
    };
  }
}

export const dataStore = new DataStore();
