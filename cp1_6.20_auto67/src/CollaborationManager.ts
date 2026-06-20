import type { Shape, Operation } from './types';

type OTTransform = (clientOp: Operation, serverOp: Operation) => Operation;

function transformAddAdd(client: Operation, server: Operation): Operation {
  return client;
}

function transformMoveMove(client: Operation, server: Operation): Operation {
  if (client.shapeId === server.shapeId) {
    return {
      ...client,
      payload: { ...client.payload, ...server.payload },
      timestamp: Math.max(client.timestamp, server.timestamp),
    };
  }
  return client;
}

function transformMoveResize(client: Operation, server: Operation): Operation {
  if (client.shapeId === server.shapeId) {
    return {
      ...client,
      payload: { ...client.payload, ...server.payload },
    };
  }
  return client;
}

function transformDeleteAny(client: Operation, _server: Operation): Operation {
  return client;
}

function resolveConflict(clientOp: Operation, serverOp: Operation): Operation {
  if (clientOp.type === 'add' && serverOp.type === 'add') {
    return transformAddAdd(clientOp, serverOp);
  }
  if (clientOp.type === 'move' && serverOp.type === 'move') {
    return transformMoveMove(clientOp, serverOp);
  }
  if (clientOp.type === 'move' && serverOp.type === 'resize') {
    return transformMoveResize(clientOp, serverOp);
  }
  if (clientOp.type === 'resize' && serverOp.type === 'move') {
    return transformMoveResize(clientOp, serverOp);
  }
  if (clientOp.type === 'delete') {
    return transformDeleteAny(clientOp, serverOp);
  }
  if (serverOp.type === 'delete') {
    return { ...clientOp, type: 'add' };
  }
  return clientOp;
}

export function applyOperation(shapes: Shape[], op: Operation): Shape[] {
  switch (op.type) {
    case 'add':
      return [...shapes, { id: op.shapeId, type: 'rect', x: 0, y: 0, width: 100, height: 100, color: '#4a90d9', strokeWidth: 2, ...op.payload } as Shape];
    case 'move':
      return shapes.map((s) =>
        s.id === op.shapeId ? { ...s, x: op.payload.x ?? s.x, y: op.payload.y ?? s.y } : s
      );
    case 'resize':
      return shapes.map((s) =>
        s.id === op.shapeId
          ? { ...s, x: op.payload.x ?? s.x, y: op.payload.y ?? s.y, width: op.payload.width ?? s.width, height: op.payload.height ?? s.height }
          : s
      );
    case 'delete':
      return shapes.filter((s) => s.id !== op.shapeId);
    case 'edit':
      return shapes.map((s) =>
        s.id === op.shapeId ? { ...s, ...op.payload } : s
      );
    default:
      return shapes;
  }
}

export { resolveConflict };
