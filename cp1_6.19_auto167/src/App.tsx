import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ForceField, Ball, PhysicsData, FieldType } from 'src/types';
import { FIELD_RANGES } from 'src/types';
import { LEVELS, cloneLevel } from 'src/data/levels';
import { SceneManager } from 'src/components/SceneManager';
import { UIComponent } from 'src/components/UIComponent';
import 'src/styles.css';

const WIN_TEXT_DURATION = 2000;

const App: React.FC = () => {
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [fields, setFields] = useState<ForceField[]>(() => {
    const lv = LEVELS[0];
    return lv.fields.map((f) => ({ ...f, position: { ...f.position } }));
  });
  const [ball, setBall] = useState<Ball>(() => {
    const lv = LEVELS[0];
    return {
      position: { ...lv.ballStart },
      velocity: { ...lv.initialVelocity },
      radius: 10,
      mass: 1,
    };
  });
  const [target, setTarget] = useState(() => {
    const lv = LEVELS[0];
    return {
      ...lv.target,
      position: { ...lv.target.position },
      size: { ...lv.target.size },
    };
  });
  const [ballStart, setBallStart] = useState(() => ({ ...LEVELS[0].ballStart }));
  const [initialVelocity, setInitialVelocity] = useState(() => ({
    ...LEVELS[0].initialVelocity,
  }));
  const [isRunning, setIsRunning] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [physicsData, setPhysicsData] = useState<PhysicsData>({
    velocity: 0,
    acceleration: 0,
    netForce: { x: 0, y: 0 },
    forceMagnitude: 0,
  });
  const [won, setWon] = useState(false);
  const [showWinText, setShowWinText] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const levelSwitchingRef = useRef(false);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const loadLevel = useCallback((id: number) => {
    const lv = LEVELS.find((l) => l.id === id);
    if (!lv) return;
    levelSwitchingRef.current = true;
    setFadeOpacity(0);
    setIsRunning(false);
    setWon(false);
    setShowWinText(false);
    setSelectedFieldId(null);
    setSelectedFieldType(null);

    setTimeout(() => {
      const cloned = cloneLevel(lv);
      setFields(cloned.fields);
      setBall({
        position: { ...cloned.ballStart },
        velocity: { ...cloned.initialVelocity },
        radius: 10,
        mass: 1,
      });
      setTarget({
        ...cloned.target,
        position: { ...cloned.target.position },
        size: { ...cloned.target.size },
      });
      setBallStart({ ...cloned.ballStart });
      setInitialVelocity({ ...cloned.initialVelocity });
      setPhysicsData({
        velocity: Math.sqrt(
          cloned.initialVelocity.x ** 2 + cloned.initialVelocity.y ** 2
        ),
        acceleration: 0,
        netForce: { x: 0, y: 0 },
        forceMagnitude: 0,
      });
      setFadeOpacity(1);
      levelSwitchingRef.current = false;
    }, 500);
  }, []);

  const handleLevelChange = useCallback(
    (id: number) => {
      if (isRunning) return;
      setCurrentLevelId(id);
      loadLevel(id);
    },
    [isRunning, loadLevel]
  );

  const handleBallUpdate = useCallback(
    (newBall: Ball, data: PhysicsData) => {
      setBall(newBall);
      setPhysicsData(data);
    },
    []
  );

  const handleFieldPlace = useCallback(
    (x: number, y: number) => {
      if (!selectedFieldType || isRunning) return;
      const range = FIELD_RANGES[selectedFieldType];
      const newField: ForceField = {
        id: uuidv4(),
        type: selectedFieldType,
        position: { x, y },
        strength: range.default,
        angle: 0,
        radius: 150,
      };
      setFields((prev) => [...prev, newField]);
      setSelectedFieldId(newField.id);
      setSelectedFieldType(null);
    },
    [selectedFieldType, isRunning]
  );

  const handleFieldSelect = useCallback(
    (id: string | null) => {
      setSelectedFieldId(id);
    },
    []
  );

  const handleFieldMove = useCallback(
    (id: string, x: number, y: number) => {
      if (isRunning) return;
      setFields((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, position: { x, y } } : f
        )
      );
    },
    [isRunning]
  );

  const handleFieldStrengthChange = useCallback(
    (strength: number) => {
      if (!selectedFieldId || isRunning) return;
      setFields((prev) =>
        prev.map((f) => (f.id === selectedFieldId ? { ...f, strength } : f))
      );
    },
    [selectedFieldId, isRunning]
  );

  const handleFieldAngleChange = useCallback(
    (angle: number) => {
      if (!selectedFieldId || isRunning) return;
      setFields((prev) =>
        prev.map((f) => (f.id === selectedFieldId ? { ...f, angle } : f))
      );
    },
    [selectedFieldId, isRunning]
  );

  const handleDeleteField = useCallback(() => {
    if (!selectedFieldId || isRunning) return;
    setFields((prev) => prev.filter((f) => f.id !== selectedFieldId));
    setSelectedFieldId(null);
  }, [selectedFieldId, isRunning]);

  const handleLaunch = useCallback(() => {
    if (isRunning) return;
    setWon(false);
    setShowWinText(false);
    setIsRunning(true);
  }, [isRunning]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setWon(false);
    setShowWinText(false);
    setBall({
      position: { ...ballStart },
      velocity: { ...initialVelocity },
      radius: 10,
      mass: 1,
    });
    setPhysicsData({
      velocity: Math.sqrt(
        initialVelocity.x ** 2 + initialVelocity.y ** 2
      ),
      acceleration: 0,
      netForce: { x: 0, y: 0 },
      forceMagnitude: 0,
    });
  }, [ballStart, initialVelocity]);

  const handleWin = useCallback(() => {
    if (won) return;
    setWon(true);
    setIsRunning(false);
    setShowWinText(true);
    setTimeout(() => setShowWinText(false), WIN_TEXT_DURATION);
  }, [won]);

  useEffect(() => {
    if (!isRunning) return;
    setPhysicsData((prev) => ({
      ...prev,
      velocity: Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2),
    }));
  }, [isRunning, ball.velocity.x, ball.velocity.y]);

  return (
    <div className="app-container">
      <SceneManager
        fields={fields}
        ball={ball}
        target={target}
        isRunning={isRunning}
        selectedFieldType={selectedFieldType}
        selectedFieldId={selectedFieldId}
        onBallUpdate={handleBallUpdate}
        onFieldPlace={handleFieldPlace}
        onFieldSelect={handleFieldSelect}
        onFieldMove={handleFieldMove}
        onWin={handleWin}
        won={won}
        fadeOpacity={fadeOpacity}
      />
      <UIComponent
        selectedFieldType={selectedFieldType}
        onSelectFieldType={setSelectedFieldType}
        selectedField={selectedField}
        onFieldStrengthChange={handleFieldStrengthChange}
        onFieldAngleChange={handleFieldAngleChange}
        onDeleteField={handleDeleteField}
        isRunning={isRunning}
        onLaunch={handleLaunch}
        onReset={handleReset}
        physicsData={physicsData}
        currentLevelId={currentLevelId}
        onLevelChange={handleLevelChange}
      />
      {showWinText && (
        <div className="win-overlay">
          <div className="win-text">通关！</div>
        </div>
      )}
    </div>
  );
};

export default App;
