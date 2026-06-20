import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layout, Typography, Button, Space, Avatar, Tag, message, Modal, 
  Form, Input, InputNumber, Select, Row, Col, Divider, Empty
} from 'antd';
import { 
  PlusOutlined, ShoppingCartOutlined, UsersOutlined, 
  CopyOutlined, HomeOutlined, MenuOutlined
} from '@ant-design/icons';
import type { Recipe, Collaborator, User, ActivityLog as ActivityLogType } from '@/types';
import { COLLABORATOR_COLORS, CATEGORIES, UNITS } from '@/types';
import { RecipeCard } from '@/components/RecipeCard';
import { ShoppingList } from '@/components/ShoppingList';
import { ActivityLog } from '@/components/ActivityLog';
import { apiService } from '@/services/api';
import { useProjectStore } from '@/store/useProjectStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const MOCK_USERS: User[] = [
  { id: 'user1', name: '张三', avatar: '👨' },
  { id: 'user2', name: '李四', avatar: '👩' },
  { id: 'user3', name: '王五', avatar: '🧑' },
];

export const ProjectPage: React.FC = () => {
  const projectId = useProjectStore(state => state.projectId);
  const projectName = useProjectStore(state => state.projectName);
  const recipes = useProjectStore(state => state.recipes);
  const collaborators = useProjectStore(state => state.collaborators);
  const currentUser = useProjectStore(state => state.currentUser);
  const isShoppingListOpen = useProjectStore(state => state.isShoppingListOpen);
  const editingRecipeId = useProjectStore(state => state.editingRecipeId);
  
  const setRecipes = useProjectStore(state => state.setRecipes);
  const addRecipe = useProjectStore(state => state.addRecipe);
  const deleteRecipe = useProjectStore(state => state.deleteRecipe);
  const setCollaborators = useProjectStore(state => state.setCollaborators);
  const updateCollaborator = useProjectStore(state => state.updateCollaborator);
  const setCurrentUser = useProjectStore(state => state.setCurrentUser);
  const setIsShoppingListOpen = useProjectStore(state => state.setIsShoppingListOpen);
  const setEditingRecipeId = useProjectStore(state => state.setEditingRecipeId);
  const addLog = useProjectStore(state => state.addLog);
  const setLogs = useProjectStore(state => state.setLogs);
  const setShoppingList = useProjectStore(state => state.setShoppingList);
  const updateShoppingListItem = useProjectStore(state => state.updateShoppingListItem);
  const highlightIngredient = useProjectStore(state => state.highlightIngredient);

  const [isMobile, setIsMobile] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [userSelectVisible, setUserSelectVisible] = useState(!currentUser);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserSelectVisible(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      initializeProject();
      setupWebSocket();
    }
    return () => {
      apiService.disconnectWebSocket();
    };
  }, [currentUser, projectId]);

  const initializeProject = async () => {
    setLoading(true);
    try {
      const project = await apiService.getProject(projectId);
      setRecipes(project.recipes);
      setLogs(project.logs);
      const shoppingList = await apiService.getShoppingList(projectId);
      setShoppingList(shoppingList);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = useCallback(() => {
    if (!currentUser) return;

    apiService.setProjectId(projectId);
    apiService.setUser(currentUser);
    const socket = apiService.connectWebSocket(projectId, currentUser);

    apiService.on('user_presence', (users: Collaborator[]) => {
      const collabs = users.map((user, index) => ({
        ...user,
        color: COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length]
      }));
      setCollaborators(collabs);
    });

    apiService.on('cursor_update', (data: { userId: string; recipeId: string; position: number }) => {
      const collab = collaborators.find(c => c.id === data.userId);
      if (collab) {
        updateCollaborator({
          ...collab,
          cursor: { recipeId: data.recipeId, position: data.position }
        });
      }
    });

    apiService.on('selection_update', (data: { userId: string; recipeId: string; start: number; end: number }) => {
      const collab = collaborators.find(c => c.id === data.userId);
      if (collab) {
        updateCollaborator({
          ...collab,
          selection: { recipeId: data.recipeId, start: data.start, end: data.end }
        });
      }
    });

    apiService.on('recipe_update', (data: { recipe: Recipe; userId: string }) => {
      if (data.userId !== currentUser.id) {
        const store = useProjectStore.getState();
        const existing = store.recipes.find(r => r.id === data.recipe.id);
        if (existing) {
          useProjectStore.getState().updateRecipe(data.recipe);
        }
      }
    });

    apiService.on('ingredient_update', async () => {
      const list = await apiService.getShoppingList(projectId);
      list.forEach(item => {
        updateShoppingListItem(item);
        highlightIngredient(item.name);
      });
    });

    apiService.on('activity_log', (log: ActivityLogType) => {
      addLog(log);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentUser, projectId, collaborators, setCollaborators, updateCollaborator, addLog, updateShoppingListItem, highlightIngredient, setLogs, setShoppingList]);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setUserSelectVisible(false);
    message.success(`欢迎回来，${user.name}！`);
  };

  const handleAddRecipe = async () => {
    try {
      const values = await form.validateFields();
      const ingredients = values.ingredients?.map((ing: any, index: number) => ({
        id: `new-${Date.now()}-${index}`,
        ...ing
      })) || [];
      
      const newRecipe = await apiService.addRecipe(projectId, {
        name: values.name,
        ingredients,
        steps: values.steps,
        estimatedTime: values.estimatedTime,
        userId: currentUser?.id,
        userName: currentUser?.name,
        userAvatar: currentUser?.avatar
      });
      
      addRecipe(newRecipe);
      apiService.emitRecipeUpdate(newRecipe);
      
      const updatedList = await apiService.getShoppingList(projectId);
      setShoppingList(updatedList);
      
      setAddModalVisible(false);
      form.resetFields();
      message.success('菜谱添加成功');
    } catch (error) {
      message.error('添加失败，请检查输入');
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      await apiService.deleteRecipe(projectId, recipeId, {
        params: {
          userId: currentUser?.id,
          userName: currentUser?.name,
          userAvatar: currentUser?.avatar
        }
      });
      deleteRecipe(recipeId);
      
      const updatedList = await apiService.getShoppingList(projectId);
      setShoppingList(updatedList);
      
      message.success('菜谱删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const copyProjectLink = () => {
    const link = `${window.location.origin}/project/${projectId}`;
    navigator.clipboard.writeText(link);
    message.success('项目链接已复制');
  };

  const totalTime = recipes.reduce((sum, r) => sum + r.estimatedTime, 0);
  const totalIngredients = recipes.reduce((sum, r) => sum + r.ingredients.length, 0);
  const onlineUsers = collaborators.filter(c => c.id !== currentUser?.id);

  return (
    <Layout className="project-layout">
      <Header className="project-header">
        <div className="header-content">
          <Space className="header-left">
            <HomeOutlined style={{ fontSize: 24, color: 'white' }} />
            <Title level={3} style={{ margin: 0, color: 'white' }}>
              🍳 {projectName}
            </Title>
          </Space>

          <Space className="header-center" size={16}>
            {!isMobile && (
              <>
                <Tag color="white" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  📋 {recipes.length} 个菜谱
                </Tag>
                <Tag color="white" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  ⏱️ 总耗时 {totalTime} 分钟
                </Tag>
                <Tag color="white" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  🥗 {totalIngredients} 种食材
                </Tag>
              </>
            )}
          </Space>

          <Space className="header-right" size={8}>
            {onlineUsers.length > 0 && (
              <Space className="online-users">
                <UsersOutlined style={{ color: 'white' }} />
                <Avatar.Group maxCount={3}>
                  {onlineUsers.map(user => (
                    <Avatar 
                      key={user.id} 
                      size="small"
                      src={user.avatar}
                      style={{ border: `2px solid ${user.color}` }}
                    >
                      {user.name.charAt(0)}
                    </Avatar>
                  ))}
                </Avatar.Group>
              </Space>
            )}

            {currentUser && (
              <Avatar 
                size="small" 
                src={currentUser.avatar}
                style={{ border: '2px solid white' }}
              />
            )}

            <Button
              icon={<CopyOutlined />}
              onClick={copyProjectLink}
              size="small"
            >
              {!isMobile && '分享'}
            </Button>

            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() => setIsShoppingListOpen(true)}
              size="small"
            >
              {!isMobile && '购物清单'}
            </Button>

            {!isMobile && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddModalVisible(true)}
                size="small"
                style={{ background: '#6B8E23', borderColor: '#6B8E23' }}
              >
                添加菜谱
              </Button>
            )}
          </Space>
        </div>
      </Header>

      <Layout className="main-layout">
        <Content className="main-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Text type="secondary">加载中...</Text>
            </div>
          ) : (
            <>
              <div className="recipes-toolbar">
                <Space>
                  <Title level={4} style={{ margin: 0, color: '#F4A460' }}>
                    📖 菜谱列表
                  </Title>
                  {isMobile && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setAddModalVisible(true)}
                      size="small"
                      style={{ background: '#6B8E23', borderColor: '#6B8E23' }}
                    >
                      添加
                    </Button>
                  )}
                </Space>
              </div>

              {recipes.length === 0 ? (
                <Empty
                  description="还没有菜谱，点击上方按钮添加第一个菜谱吧！"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <Row gutter={[16, 16]} className="recipes-grid">
                  {recipes.map(recipe => (
                    <Col xs={24} sm={24} md={12} lg={8} xl={6} key={recipe.id}>
                      <RecipeCard
                        recipe={recipe}
                        isEditing={editingRecipeId === recipe.id}
                        onEdit={setEditingRecipeId}
                        onDelete={handleDeleteRecipe}
                        collaborators={collaborators}
                      />
                    </Col>
                  ))}
                </Row>
              )}
            </>
          )}
        </Content>

        {!isMobile && <ActivityLog isMobile={false} />}
      </Layout>

      {isMobile && <ActivityLog isMobile={true} />}

      {isMobile && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
          className="mobile-add-btn"
          style={{
            background: 'linear-gradient(135deg, #6B8E23 0%, #7BA030 100%)',
            border: 'none'
          }}
        />
      )}

      <ShoppingList
        open={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
      />

      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#F4A460' }} />
            <Title level={5} style={{ margin: 0, color: '#F4A460' }}>
              添加新菜谱
            </Title>
          </Space>
        }
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="菜名"
                rules={[{ required: true, message: '请输入菜名' }]}
              >
                <Input placeholder="例如：宫保鸡丁" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="estimatedTime"
                label="预估用时（分钟）"
                rules={[{ required: true, message: '请输入预估用时' }]}
                initialValue={30}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />
          
          <Title level={5} style={{ color: '#6B8E23', marginBottom: 12 }}>
            🥗 食材列表
          </Title>
          
          <Form.List
            name="ingredients"
            initialValue={[
              { name: '', quantity: 100, unit: '克', category: '蔬菜' }
            ]}
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '食材名' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="食材名" size="small" />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: '用量' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} step={0.5} style={{ width: '100%' }} size="small" />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'unit']}
                        rules={[{ required: true, message: '单位' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select size="small">
                          {UNITS.map(unit => (
                            <Option key={unit} value={unit}>{unit}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'category']}
                        rules={[{ required: true, message: '分类' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select size="small">
                          {CATEGORIES.map(cat => (
                            <Option key={cat} value={cat}>{cat}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button
                        type="text"
                        danger
                        icon={<PlusOutlined rotate={45} />}
                        onClick={() => remove(name)}
                        size="small"
                      />
                    </Col>
                  </Row>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ name: '', quantity: 100, unit: '克', category: '蔬菜' })}
                  icon={<PlusOutlined />}
                  size="small"
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  添加食材
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item
            name="steps"
            label="烹饪步骤"
            rules={[{ required: true, message: '请输入烹饪步骤' }]}
          >
            <Input.TextArea
              rows={5}
              placeholder="请输入烹饪步骤，支持Markdown格式换行"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddModalVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleAddRecipe}>
                添加菜谱
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="选择您的身份"
        open={userSelectVisible}
        closable={false}
        footer={null}
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            请选择您的身份进入协作
          </Text>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {MOCK_USERS.map(user => (
              <Button
                key={user.id}
                size="large"
                onClick={() => handleSelectUser(user)}
                style={{ 
                  height: 56, 
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  fontSize: 16
                }}
              >
                <span style={{ fontSize: 24 }}>{user.avatar}</span>
                <span>{user.name}</span>
              </Button>
            ))}
          </Space>
        </div>
      </Modal>
    </Layout>
  );
};
