import styled from 'styled-components';

interface AnimationCardProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CardContainer = styled.div`
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #F9FAFB, #F3F4F6);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #F3F4F6, #E5E7EB);
  }
`;

const CardTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
`;

const ToggleIcon = styled.span<{ $expanded: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
  transition: transform 0.2s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  font-size: 12px;
`;

const CardContent = styled.div<{ $expanded: boolean }>`
  padding: ${props => props.$expanded ? '16px' : '0 16px'};
  max-height: ${props => props.$expanded ? '600px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
`;

const AnimationCard = ({ title, isExpanded, onToggle, children }: AnimationCardProps) => {
  return (
    <CardContainer>
      <CardHeader onClick={onToggle}>
        <CardTitle>{title}</CardTitle>
        <ToggleIcon $expanded={isExpanded}>▼</ToggleIcon>
      </CardHeader>
      <CardContent $expanded={isExpanded}>
        {children}
      </CardContent>
    </CardContainer>
  );
};

export default AnimationCard;
