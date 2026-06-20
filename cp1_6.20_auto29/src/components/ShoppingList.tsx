import React, { useState, useEffect } from 'react';
import { Drawer, Button, List, Collapse, Tag, InputNumber, Space, Typography, Card, Spin, message, Tabs, Input, Divider } from 'antd';
import { ShoppingCartOutlined, ThunderboltOutlined, FileTextOutlined, FilePdfOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import type { ShoppingItem, OptimizationResult } from '@/types';
import { apiService } from '@/services/api';
import { useProjectStore } from '@/store/useProjectStore';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ShoppingListProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  '蔬菜': '🥬',
  '肉类': '🥩',
  '调味料': '🧂',
  '海鲜': '🦐',
  '主食': '🍚',
  '蛋奶': '🥚',
  '其他': '📦'
};

const CHART_COLORS = ['#F4A460', '#6B8E23', '#4A90D9', '#E74C3C', '#9B59B6', '#1ABC9C', '#F39C12'];

export const ShoppingList: React.FC<ShoppingListProps> = ({ open, onClose }) => {
  const projectId = useProjectStore(state => state.projectId);
  const shoppingList = useProjectStore(state => state.shoppingList);
  const optimizationResult = useProjectStore(state => state.optimizationResult);
  const setOptimizationResult = useProjectStore(state => state.setOptimizationResult);
  const setShoppingList = useProjectStore(state => state.setShoppingList);
  const highlightedIngredients = useProjectStore(state => state.highlightedIngredients);
  const clearHighlight = useProjectStore(state => state.clearHighlight);
  const currentUser = useProjectStore(state => state.currentUser);

  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'optimize'>('list');
  const [localItems, setLocalItems] = useState<ShoppingItem[]>([]);
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    if (open) {
      loadShoppingList();
    }
  }, [open, projectId]);

  useEffect(() => {
    setLocalItems(shoppingList);
  }, [shoppingList]);

  useEffect(() => {
    highlightedIngredients.forEach(name => {
      const timer = setTimeout(() => {
        clearHighlight(name);
      }, 3000);
      return () => clearTimeout(timer);
    });
  }, [highlightedIngredients, clearHighlight]);

  const loadShoppingList = async () => {
    setLoading(true);
    try {
      const list = await apiService.getShoppingList(projectId);
      setShoppingList(list);
    } catch (error) {
      message.error('加载购物清单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const result = await apiService.optimizeShoppingList(projectId, localItems);
      setOptimizationResult(result);
      setActiveTab('optimize');
      message.success(`优化完成，共优化 ${result.savedItems.length} 项食材`);
    } catch (error) {
      message.error('优化失败，请稍后重试');
    } finally {
      setOptimizing(false);
    }
  };

  const handleQuantityChange = (name: string, value: number) => {
    setLocalItems(prev =>
      prev.map(item =>
        item.name === name ? { ...item, totalQuantity: value } : item
      )
    );
  };

  const groupByCategory = (items: ShoppingItem[]) => {
    const groups: Record<string, ShoppingItem[]> = {};
    items.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  };

  const exportToText = () => {
    const items = optimizationResult?.after || localItems;
    const groups = groupByCategory(items);
    
    let text = `🛒 购物清单 - ${new Date().toLocaleDateString('zh-CN')}\n`;
    text += '='.repeat(40) + '\n\n';
    
    Object.entries(groups).forEach(([category, categoryItems]) => {
      text += `${CATEGORY_ICONS[category] || '📦'} ${category}\n`;
      text += '-'.repeat(30) + '\n';
      categoryItems.forEach(item => {
        text += `  • ${item.name}: ${item.totalQuantity}${item.unit}\n`;
        text += `    来自: ${item.recipes.join('、')}\n`;
      });
      text += '\n';
    });
    
    if (customNote) {
      text += '📝 备注:\n';
      text += `  ${customNote}\n\n`;
    }
    
    text += '='.repeat(40) + '\n';
    text += '总食材种类: ' + items.length + ' 种\n';
    text += '生成时间: ' + new Date().toLocaleString('zh-CN');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `购物清单_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('购物清单已导出为文本');
  };

  const exportToPDF = () => {
    const items = optimizationResult?.after || localItems;
    const groups = groupByCategory(items);
    
    const doc = new jsPDF();
    let yPos = 20;
    
    doc.setFontSize(20);
    doc.setTextColor(244, 164, 96);
    doc.text('🛒 购物清单', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 20, yPos);
    yPos += 15;
    
    doc.setTextColor(0);
    
    Object.entries(groups).forEach(([category, categoryItems]) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(107, 142, 35);
      doc.text(`${CATEGORY_ICONS[category] || '📦'} ${category}`, 20, yPos);
      yPos += 8;
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(200);
      doc.line(20, yPos, 190, yPos);
      yPos += 8;
      
      categoryItems.forEach(item => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`• ${item.name}: ${item.totalQuantity}${item.unit}`, 25, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`  来自: ${item.recipes.join('、')}`, 25, yPos);
        yPos += 8;
      });
      
      yPos += 5;
    });
    
    if (customNote) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(244, 164, 96);
      doc.text('📝 备注:', 20, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(customNote, 170);
      lines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 25, yPos);
        yPos += 6;
      });
    }
    
    doc.save(`购物清单_${new Date().toISOString().split('T')[0]}.pdf`);
    message.success('购物清单已导出为PDF');
  };

  const renderOptimizationChart = () => {
    if (!optimizationResult) return null;

    const chartData = optimizationResult.after.slice(0, 10).map((item, index) => {
      const beforeItem = optimizationResult.before.find(b => b.name === item.name);
      return {
        name: item.name,
        优化前: beforeItem?.totalQuantity || 0,
        优化后: item.totalQuantity,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      };
    });

    return (
      <Card
        title="📊 优化前后对比"
        size="small"
        style={{ marginTop: 16 }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Legend />
            <Bar dataKey="优化前" fill="#f0a0a0" radius={[0, 4, 4, 0]} />
            <Bar dataKey="优化后" fill="#6B8E23" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {optimizationResult.savedItems.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ color: '#6B8E23' }}>✨ 已优化的食材:</Text>
            <List
              size="small"
              dataSource={optimizationResult.savedItems}
              renderItem={item => (
                <List.Item>
                  <Space>
                    <CheckOutlined style={{ color: '#6B8E23' }} />
                    <Text>{item.name}</Text>
                    <Tag color="green">+{item.saved.toFixed(1)} 单位</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}

        <Divider />
        
        <Title level={5} style={{ color: '#F4A460', marginTop: 0 }}>
          🎯 优化后的购物清单
        </Title>
        {renderShoppingItems(optimizationResult.after)}
      </Card>
    );
  };

  const renderShoppingItems = (items: ShoppingItem[]) => {
    const groups = groupByCategory(items);
    
    return (
      <Collapse 
        defaultActiveKey={Object.keys(groups)} 
        ghost
        style={{ background: 'transparent' }}
      >
        {Object.entries(groups).map(([category, categoryItems]) => (
          <Panel
            key={category}
            header={
              <Space>
                <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[category] || '📦'}</span>
                <Text strong>{category}</Text>
                <Tag color="orange">{categoryItems.length} 项</Tag>
              </Space>
            }
          >
            <List
              size="small"
              dataSource={categoryItems}
              renderItem={item => {
                const isHighlighted = highlightedIngredients.includes(item.name);
                return (
                  <List.Item
                    className={isHighlighted ? 'highlight-item' : ''}
                    style={{
                      background: isHighlighted ? '#FFE4B5' : 'transparent',
                      transition: 'background 3s ease-out',
                      borderRadius: 8,
                      padding: '8px 12px',
                      marginBottom: 4
                    }}
                    actions={[
                      <InputNumber
                        key="qty"
                        size="small"
                        min={0}
                        step={0.5}
                        value={item.totalQuantity}
                        onChange={(value) => handleQuantityChange(item.name, value as number)}
                        style={{ width: 70 }}
                      />,
                      <Text key="unit" type="secondary">{item.unit}</Text>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{item.name}</Text>
                        </Space>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          来自: {item.recipes.join('、')}
                        </Text>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Panel>
        ))}
      </Collapse>
    );
  };

  const itemsToShow = activeTab === 'optimize' && optimizationResult
    ? optimizationResult.after
    : localItems;

  return (
    <Drawer
      title={
        <Space>
          <ShoppingCartOutlined style={{ color: '#F4A460', fontSize: 24 }} />
          <Title level={4} style={{ margin: 0, color: '#F4A460' }}>
            购物清单
          </Title>
          <Tag color="green">{itemsToShow.length} 项食材</Tag>
        </Space>
      }
      placement="right"
      width={450}
      onClose={onClose}
      open={open}
      extra={
        <Button type="text" onClick={onClose} icon={<CloseOutlined />} />
      }
    >
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'list' | 'optimize')}
          items={[
            {
              key: 'list',
              label: '📋 清单',
              children: renderShoppingItems(localItems)
            },
            {
              key: 'optimize',
              label: '⚡ 智能优化',
              children: (
                <div>
                  <Paragraph type="secondary">
                    系统将自动合并重复食材，并取整到常用采购单位，帮助您更高效地采购。
                  </Paragraph>
                  
                  <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={handleOptimize}
                    loading={optimizing}
                    block
                    style={{ 
                      background: 'linear-gradient(135deg, #F4A460 0%, #F5B87A 100%)',
                      border: 'none',
                      height: 48,
                      borderRadius: 12
                    }}
                  >
                    开始智能优化
                  </Button>

                  {optimizationResult && renderOptimizationChart()}
                </div>
              )
            }
          ]}
        />

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ color: '#6B8E23' }}>📝 添加备注:</Text>
          <Input.TextArea
            rows={2}
            placeholder="可选：添加采购备注，如"请买有机蔬菜"等"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              icon={<FileTextOutlined />}
              onClick={exportToText}
              style={{ flex: 1, marginRight: 8 }}
            >
              导出文本
            </Button>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={exportToPDF}
              style={{ flex: 1, background: '#F4A460', border: 'none' }}
            >
              导出PDF
            </Button>
          </Space>
          
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            共 {itemsToShow.length} 项食材待采购
          </Text>
        </Space>
      </Spin>
    </Drawer>
  );
};
