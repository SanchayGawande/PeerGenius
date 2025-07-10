// frontend/src/components/Whiteboard.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Arrow } from 'react-konva';
import { useWhiteboard } from '../contexts/WhiteboardContext';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

export default function Whiteboard({ whiteboardId, width = 800, height = 600 }) {
  const { currentWhiteboard, updateWhiteboardElements } = useWhiteboard();
  const { socket } = useSocket();
  const { currentUser } = useAuth();
  
  const [tool, setTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [elements, setElements] = useState([]);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const stageRef = useRef();

  // Load whiteboard elements when whiteboard changes
  useEffect(() => {
    if (currentWhiteboard && currentWhiteboard.elements) {
      setElements(currentWhiteboard.elements);
    }
  }, [currentWhiteboard]);

  // Socket.IO listeners for real-time collaboration
  useEffect(() => {
    if (!socket || !whiteboardId) return;

    // Join whiteboard room
    socket.emit('whiteboard:join', whiteboardId);

    // Listen for real-time updates
    const handleWhiteboardUpdate = (data) => {
      if (data.whiteboardId === whiteboardId && data.author.userId !== currentUser?.uid) {
        console.log('🎨 Received real-time whiteboard update:', data);
        setElements(data.elements);
      }
    };

    socket.on('whiteboard:update', handleWhiteboardUpdate);

    return () => {
      socket.emit('whiteboard:leave', whiteboardId);
      socket.off('whiteboard:update', handleWhiteboardUpdate);
    };
  }, [socket, whiteboardId, currentUser]);

  // Generate unique ID for elements
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Handle mouse down (start drawing)
  const handleMouseDown = (e) => {
    if (tool === 'select') return;

    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'pen') {
      setCurrentPath([pos.x, pos.y]);
    } else if (tool === 'rectangle' || tool === 'circle') {
      const newElement = {
        id: generateId(),
        type: tool,
        data: {
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0
        },
        style: {
          strokeColor,
          strokeWidth,
          fillColor: 'transparent'
        },
        author: {
          userId: currentUser?.uid,
          email: currentUser?.email
        }
      };
      setElements(prev => [...prev, newElement]);
    }
  };

  // Handle mouse move (continue drawing)
  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === 'pen') {
      setCurrentPath(prev => [...prev, point.x, point.y]);
    } else if (tool === 'rectangle' || tool === 'circle') {
      setElements(prev => {
        const newElements = [...prev];
        const lastElement = newElements[newElements.length - 1];
        if (lastElement) {
          const startX = lastElement.data.x;
          const startY = lastElement.data.y;
          lastElement.data.width = point.x - startX;
          lastElement.data.height = point.y - startY;
        }
        return newElements;
      });
    }
  };

  // Handle mouse up (finish drawing)
  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (tool === 'pen' && currentPath.length > 0) {
      const newElement = {
        id: generateId(),
        type: 'freehand',
        data: {
          points: currentPath
        },
        style: {
          strokeColor,
          strokeWidth
        },
        author: {
          userId: currentUser?.uid,
          email: currentUser?.email
        }
      };
      
      const updatedElements = [...elements, newElement];
      setElements(updatedElements);
      
      // Save to backend and broadcast
      saveAndBroadcast([newElement], 'add');
      setCurrentPath([]);
    } else if ((tool === 'rectangle' || tool === 'circle') && elements.length > 0) {
      const lastElement = elements[elements.length - 1];
      if (Math.abs(lastElement.data.width) > 5 || Math.abs(lastElement.data.height) > 5) {
        // Save to backend and broadcast
        saveAndBroadcast([lastElement], 'add');
      } else {
        // Remove tiny elements
        setElements(prev => prev.slice(0, -1));
      }
    }
  };

  // Save elements to backend and broadcast via Socket.IO
  const saveAndBroadcast = async (elementsToSave, action) => {
    try {
      await updateWhiteboardElements(whiteboardId, elementsToSave, action);
      
      // Broadcast real-time update
      if (socket) {
        socket.emit('whiteboard:drawing', {
          whiteboardId,
          elements: elementsToSave,
          action
        });
      }
    } catch (error) {
      console.error('Failed to save whiteboard changes:', error);
    }
  };

  // Clear whiteboard
  const clearWhiteboard = async () => {
    if (window.confirm('Are you sure you want to clear the whiteboard? This cannot be undone.')) {
      setElements([]);
      try {
        await updateWhiteboardElements(whiteboardId, elements, 'delete');
        if (socket) {
          socket.emit('whiteboard:drawing', {
            whiteboardId,
            elements: [],
            action: 'clear'
          });
        }
      } catch (error) {
        console.error('Failed to clear whiteboard:', error);
      }
    }
  };

  // Render element based on type
  const renderElement = (element, index) => {
    const { id, type, data, style } = element;

    switch (type) {
      case 'freehand':
        return (
          <Line
            key={id}
            points={data.points}
            stroke={style.strokeColor}
            strokeWidth={style.strokeWidth}
            tension={0.5}
            lineCap="round"
            globalCompositeOperation="source-over"
          />
        );
      case 'rectangle':
        return (
          <Rect
            key={id}
            x={data.x}
            y={data.y}
            width={data.width}
            height={data.height}
            stroke={style.strokeColor}
            strokeWidth={style.strokeWidth}
            fill={style.fillColor}
          />
        );
      case 'circle':
        return (
          <Circle
            key={id}
            x={data.x + data.width / 2}
            y={data.y + data.height / 2}
            radius={Math.abs(data.width) / 2}
            stroke={style.strokeColor}
            strokeWidth={style.strokeWidth}
            fill={style.fillColor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          {/* Tools */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { value: 'pen', icon: '✏️', label: 'Pen' },
              { value: 'rectangle', icon: '⬜', label: 'Rectangle' },
              { value: 'circle', icon: '⭕', label: 'Circle' },
              { value: 'select', icon: '👆', label: 'Select' }
            ].map(({ value, icon, label }) => (
              <button
                key={value}
                onClick={() => setTool(value)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  tool === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-200'
                }`}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Width:</span>
            <select
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={4}>4px</option>
              <option value={6}>6px</option>
              <option value={8}>8px</option>
            </select>
          </div>

          {/* Color Picker */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Color:</span>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Clear button */}
          <button
            onClick={clearWhiteboard}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-white" style={{ width: width, height: height }}>
        <Stage
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          ref={stageRef}
        >
          <Layer>
            {/* Render saved elements */}
            {elements.map((element, index) => renderElement(element, index))}
            
            {/* Render current drawing path */}
            {isDrawing && tool === 'pen' && currentPath.length > 0 && (
              <Line
                points={currentPath}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation="source-over"
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}