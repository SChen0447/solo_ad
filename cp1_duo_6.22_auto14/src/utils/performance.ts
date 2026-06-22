export interface PerfMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  passed: boolean;
}

export class PerformanceTester {
  private metrics: PerfMetric[] = [];
  
  measure(name: string, threshold: number, unit: string, fn: () => void): void {
    const startTime = performance.now();
    fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.metrics.push({
      name,
      value: duration,
      unit,
      threshold,
      passed: duration <= threshold
    });
  }
  
  async measureAsync(name: string, threshold: number, unit: string, fn: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.metrics.push({
      name,
      value: duration,
      unit,
      threshold,
      passed: duration <= threshold
    });
  }
  
  addMetric(name: string, value: number, threshold: number, unit: string): void {
    this.metrics.push({
      name,
      value,
      unit,
      threshold,
      passed: value <= threshold
    });
  }
  
  getMetrics(): PerfMetric[] {
    return [...this.metrics];
  }
  
  getAllPassed(): boolean {
    return this.metrics.every(m => m.passed);
  }
  
  printReport(): void {
    console.log('\n========== 性能测试报告 ==========');
    console.log(`测试项: ${this.metrics.length}`);
    console.log(`通过: ${this.metrics.filter(m => m.passed).length}`);
    console.log(`失败: ${this.metrics.filter(m => !m.passed).length}`);
    console.log('----------------------------------');
    
    for (const m of this.metrics) {
      const status = m.passed ? '✅ 通过' : '❌ 失败';
      console.log(`${status} ${m.name}: ${m.value.toFixed(2)}${m.unit} (阈值: ${m.threshold}${m.unit})`);
    }
    
    console.log('==================================\n');
  }
  
  clear(): void {
    this.metrics = [];
  }
}

export const perfTester = new PerformanceTester();
