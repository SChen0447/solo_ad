import { Controller } from 'egg';

class BatchController extends Controller {
  async list() {
    const { ctx } = this;
    const { offset = 0, limit = 20, beanId } = ctx.query;
    try {
      const batches = await ctx.service.batch.findAll(
        parseInt(offset as string),
        parseInt(limit as string),
        { beanId: beanId as string | undefined }
      );
      ctx.body = {
        success: true,
        data: batches,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Failed to fetch batches',
      };
    }
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    try {
      const batch = await ctx.service.batch.findById(parseInt(id));
      if (!batch) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Batch not found' };
        return;
      }
      ctx.body = {
        success: true,
        data: batch,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Failed to fetch batch',
      };
    }
  }

  async create() {
    const { ctx } = this;
    const { beanId, date, duration, inTemp, outTemp, curveData, flavors, notes } = ctx.request.body;

    if (!beanId || !date || duration === undefined || inTemp === undefined || outTemp === undefined || !curveData || !flavors) {
      ctx.status = 400;
      ctx.body = { success: false, message: 'Missing required fields' };
      return;
    }

    try {
      const batch = await ctx.service.batch.create({
        beanId,
        date,
        duration: Number(duration),
        inTemp: Number(inTemp),
        outTemp: Number(outTemp),
        curveData,
        flavors,
        notes: notes || '',
      });

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: batch,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Failed to create batch',
      };
    }
  }

  async compare() {
    const { ctx } = this;
    const { ids } = ctx.request.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = { success: false, message: 'Invalid batch ids' };
      return;
    }

    try {
      const batches = await ctx.service.batch.findByIds(ids.map(Number));
      ctx.body = {
        success: true,
        data: batches,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Failed to fetch batches',
      };
    }
  }
}

export default BatchController;
