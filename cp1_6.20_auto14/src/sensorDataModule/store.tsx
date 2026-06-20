import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import {
  SensorState,
  sensorInitialState,
  sensorReducer,
  AlertRule,
  AlertNotification,
  SensorData,
} from './types';
import { createDataGenerator } from './dataGenerator';

interface SensorContextValue {
  state: SensorState;
  addSensorData: (data: SensorData) => void;
  addAlertRule: (rule: AlertRule) => void;
  updateAlertRule: (rule: AlertRule) => void;
  deleteAlertRule: (id: string) => void;
  addAlertNotification: (notification: AlertNotification) => void;
  removeAlertNotification: (id: string) => void;
}

const SensorContext = createContext<SensorContextValue | null>(null);

export const useSensorStore = (): SensorContextValue => {
  const ctx = useContext(SensorContext);
  if (!ctx) {
    throw new Error('useSensorStore must be used within SensorStoreProvider');
  }
  return ctx;
};

interface SensorStoreProviderProps {
  children: ReactNode;
}

export const SensorStoreProvider: React.FC<SensorStoreProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(sensorReducer, sensorInitialState);
  const generatorStarted = useRef(false);

  const addSensorData = useCallback((data: SensorData) => {
    dispatch({ type: 'ADD_SENSOR_DATA', payload: data });
  }, []);

  const addAlertRule = useCallback((rule: AlertRule) => {
    dispatch({ type: 'ADD_ALERT_RULE', payload: rule });
  }, []);

  const updateAlertRule = useCallback((rule: AlertRule) => {
    dispatch({ type: 'UPDATE_ALERT_RULE', payload: rule });
  }, []);

  const deleteAlertRule = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ALERT_RULE', payload: id });
  }, []);

  const addAlertNotification = useCallback((notification: AlertNotification) => {
    dispatch({ type: 'ADD_ALERT_NOTIFICATION', payload: notification });
  }, []);

  const removeAlertNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ALERT_NOTIFICATION', payload: id });
  }, []);

  useEffect(() => {
    if (generatorStarted.current) return;
    generatorStarted.current = true;
    const generator = createDataGenerator({
      onData: (data) => {
        addSensorData(data);
      },
    });
    generator.start();
    return () => {
      generator.stop();
      generatorStarted.current = false;
    };
  }, [addSensorData]);

  const value: SensorContextValue = {
    state,
    addSensorData,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    addAlertNotification,
    removeAlertNotification,
  };

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
};
