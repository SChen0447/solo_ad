import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, InputNumber, Select, Form, Modal, Tag, Space, Typography, message } from 'antd';
import { EditOutlined, DeleteOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import type { Recipe, Ingredient, Collaborator } from '@/types';
import { CATEGORIES, UNITS } from '@/types';
import { apiService } from '@/services/api';
import { useProjectStore } from '@/store/useProjectStore';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface RecipeCardProps {
  recipe: Recipe;
  isEditing: boolean;
  onEdit: (id: string | null) => void;
  onDelete: (id: string) => void;
  collaborators: Collaborator[];
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  isEditing,
  onEdit,
  onDelete,
  collaborators
}) => {
  const [form] = Form.useForm();
  const projectId = useProjectStore(state => state.projectId);
  const currentUser = useProjectStore(state => state.currentUser);
  const updateRecipe = useProjectStore(state => state.updateRecipe);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'preview'>('view');
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    if (isEditing) {
      setEditMode('edit');
      form.setFieldsValue({
        name: recipe.name,
        estimatedTime: recipe.estimatedTime,
        steps: recipe.steps,
        ingredients: recipe.ingredients
      });
    } else {
      setEditMode('view');
    }
  }, [isEditing, recipe, form]);

  useEffect(() => {
    if (editMode === 'preview' || editMode === 'edit') {
      const steps = form.getFieldValue('steps') || recipe.steps;
      setPreviewContent(marked.parse(steps) as string);
    }
  }, [editMode, form, recipe.steps]);

  const handleCursorChange = useCallback((position: number) => {
    apiService.emitCursorUpdate(recipe.id, position);
  }, [recipe.id]);

  const handleSelectionChange = useCallback((start: number, end: number) => {
    apiService.emitSelectionUpdate(recipe.id, start, end);
  }, [recipe.id]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const updatedRecipe = await apiService.updateRecipe(projectId, recipe.id, {
        ...values,
        userId: currentUser?.id,
        userName: currentUser?.name,
        userAvatar: currentUser?.avatar
      });
      updateRecipe(updatedRecipe);
      apiService.emitRecipeUpdate(updatedRecipe);
      setEditMode('view');
      onEdit(null);
      message.success('菜谱保存成功');
    } catch (error) {
      message.error('保存失败，请检查输入');
    }
  };

  const handleCancel = () => {
    setEditMode('view');
    onEdit(null);
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除菜谱"${recipe.name}"吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onDelete(recipe.id);
      }
    });
  };

  const handleQuantityChange = (ingredient: Ingredient, oldValue: number, newValue: number) => {
    if (oldValue !== newValue) {
      apiService.emitIngredientUpdate(recipe.id, {
        name: ingredient.name,
        oldQuantity: oldValue,
        newQuantity: newValue
      });
    }
  };

  const editingCollaborators = collaborators.filter(
    c => c.cursor?.recipeId === recipe.id || c.selection?.recipeId === recipe.id
  );

  if (editMode === 'view') {
    return (
      <Card
        className="recipe-card"
        hoverable
        actions={[
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(recipe.id)}
            key="edit"
          >
            编辑
          </Button>,
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            key="delete"
          >
            删除
          </Button>
        ]}
      >
        <Card.Meta
          title={
            <Space>
              <Title level={4} style={{ margin: 0, color: '#F4A460' }}>{recipe.name}</Title>
              {editingCollaborators.map(c => (
                <Tag key={c.id} color={c.color} style={{ marginLeft: 8 }}>
                  {c.avatar} {c.name} 正在编辑
                </Tag>
              ))}
            </Space>
          }
          description={
            <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 12 }}>
              <Space>
                <ClockCircleOutlined style={{ color: '#6B8E23' }} />
                <Text type="secondary">预估用时: {recipe.estimatedTime} 分钟</Text>
              </Space>
              
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ color: '#6B8E23' }}>食材:</Text>
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {recipe.ingredients.map(ing => (
                    <Tag key={ing.id} color="green" style={{ background: '#6B8E23', color: 'white', borderRadius: 16 }}>
                      {ing.name} {ing.quantity}{ing.unit}
                    </Tag>
                  ))}
                </div>
              </div>
              
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ color: '#6B8E23' }}>步骤:</Text>
                <Paragraph style={{ marginTop: 4, whiteSpace: 'pre-wrap', color: '#666' }}>
                  {recipe.steps}
                </Paragraph>
              </div>
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      className="recipe-card editing"
      style={{ borderColor: '#F4A460', borderWidth: 2 }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: recipe.name,
          estimatedTime: recipe.estimatedTime,
          steps: recipe.steps,
          ingredients: recipe.ingredients
        }}
      >
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0, color: '#F4A460' }}>
            {editMode === 'preview' ? '预览' : '编辑'}: {form.getFieldValue('name') || recipe.name}
          </Title>
          <Space>
            {editingCollaborators.map(c => (
              <Tag key={c.id} color={c.color}>
                {c.avatar} {c.name}
              </Tag>
            ))}
          </Space>
        </Space>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Form.Item
              name="name"
              label="菜名"
              rules={[{ required: true, message: '请输入菜名' }]}
            >
              <Input placeholder="请输入菜名" />
            </Form.Item>

            <Form.Item
              name="estimatedTime"
              label="预估用时（分钟）"
              rules={[{ required: true, message: '请输入预估用时' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.List name="ingredients">
              {(fields, { add, remove }) => (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ color: '#6B8E23' }}>食材列表</Text>
                    <Button
                      type="dashed"
                      onClick={() => add({ name: '', quantity: 1, unit: '克', category: '其他' })}
                      icon={<PlusOutlined />}
                      size="small"
                    >
                      添加食材
                    </Button>
                  </div>
                  {fields.map(({ key, name, fieldKey, ...restField }) => {
                    const ingredient = recipe.ingredients[key];
                    return (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          fieldKey={[fieldKey, 'name']}
                          rules={[{ required: true, message: '请输入食材名' }]}
                          style={{ marginBottom: 0, minWidth: 100 }}
                        >
                          <Input placeholder="食材名" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          fieldKey={[fieldKey, 'quantity']}
                          rules={[{ required: true, message: '请输入用量' }]}
                          style={{ marginBottom: 0, width: 80 }}
                        >
                          <InputNumber
                            min={0}
                            step={0.5}
                            onChange={(value) => handleQuantityChange(
                              ingredient,
                              ingredient.quantity,
                              value as number
                            )}
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'unit']}
                          fieldKey={[fieldKey, 'unit']}
                          rules={[{ required: true, message: '请选择单位' }]}
                          style={{ marginBottom: 0, width: 80 }}
                        >
                          <Select>
                            {UNITS.map(unit => (
                              <Option key={unit} value={unit}>{unit}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'category']}
                          fieldKey={[fieldKey, 'category']}
                          rules={[{ required: true, message: '请选择分类' }]}
                          style={{ marginBottom: 0, width: 100 }}
                        >
                          <Select>
                            {CATEGORIES.map(cat => (
                              <Option key={cat} value={cat}>{cat}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                      </Space>
                    );
                  })}
                </>
              )}
            </Form.List>

            <Form.Item
              name="steps"
              label="烹饪步骤"
              rules={[{ required: true, message: '请输入烹饪步骤' }]}
            >
              <TextArea
                rows={8}
                placeholder="请输入烹饪步骤，支持Markdown格式"
                onSelect={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  handleSelectionChange(target.selectionStart, target.selectionEnd);
                }}
                onChange={(e) => {
                  handleCursorChange(e.target.selectionStart);
                  setPreviewContent(marked.parse(e.target.value) as string);
                }}
              />
            </Form.Item>
          </div>

          <div className="markdown-preview">
            <Text strong style={{ color: '#6B8E23', display: 'block', marginBottom: 8 }}>
              Markdown 实时预览
            </Text>
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
            
            {editingCollaborators.map(c => (
              c.cursor && (
                <div
                  key={c.id}
                  className="collaborator-cursor"
                  style={{
                    position: 'absolute',
                    borderLeft: `2px solid ${c.color}`,
                    height: '20px',
                    marginTop: c.cursor.position * 1.5
                  }}
                >
                  <Tag color={c.color} style={{ fontSize: 12 }}>
                    {c.avatar} {c.name}
                  </Tag>
                </div>
              )
            ))}
          </div>
        </div>

        <Form.Item style={{ marginTop: 16, marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel} icon={<CloseOutlined />}>
              取消
            </Button>
            <Button
              type={editMode === 'preview' ? 'default' : 'primary'}
              onClick={() => setEditMode(editMode === 'preview' ? 'edit' : 'preview')}
            >
              {editMode === 'preview' ? '返回编辑' : '预览'}
            </Button>
            <Button type="primary" onClick={handleSave} icon={<CheckOutlined />}>
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};
