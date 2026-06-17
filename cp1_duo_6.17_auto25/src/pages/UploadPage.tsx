import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseDependencies } from '../utils/parseDependencies';
import { useGraphContext } from '../context