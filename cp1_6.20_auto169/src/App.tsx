import React, { useState, useCallback } from 'react'
import { ParticleRenderer } from './particleRenderer'
import { TextInput, LineChart, PieChart, Slider } from './uiComponents'
import { analyzeEmotion, SentenceEmotion, aggregateEmotions } from './emotionAnalyzer'

interface ParticleParams {
  rotationSpeed: number
  diffusion: number
  saturation: number
}

const defaultText = `I am so happy and excited today! The sun is shining and everything feels amazing.
But sometimes I feel sad and lonely, thinking about the past.
Wow, that's incredible! I can't believe how wonderful this surprise is!
I hate when people are rude and angry, it makes me so furious.
Life is beautiful, full of joy and hope for the future.`

const App: React.FC = () => {
  const [inputText, setInputText] = useState(defaultText)
  const [emotions, setEmotions] = useState<SentenceEmotion[]>([])
  const [params, setParams] = useState<ParticleParams>({
    rotationSpeed: 1.0,
    diffusion: 1.0,
    saturation: 1.0
  })

  const handleAnalyze = useCallback(() => {
    const result = analyzeEmotion(inputText)
    setEmotions(result)
  }, [inputText])

  const emotionAgg = aggregateEmotions(emotions)

  return (
    <div className="app-container">
      <ParticleRenderer emotions={emotions} params={params} />

      <div className="ui-container">
        <div className="input-section">
          <TextInput value={inputText} onChange={setInputText} onAnalyze={handleAnalyze} />
          <LineChart emotions={emotions} />
        </div>

        <div className="control-panel">
          <PieChart
            positive={emotionAgg.positive}
            negative={emotionAgg.negative}
            surprise={emotionAgg.surprise}
            anger={emotionAgg.anger}
          />

          <div className="sliders-container">
            <Slider
              label="旋转速度"
              value={params.rotationSpeed}
              min={0}
              max={2}
              step={0.1}
              unit="rad/s"
              onChange={(v) => setParams(p => ({ ...p, rotationSpeed: v }))}
            />
            <Slider
              label="扩散幅度"
              value={params.diffusion}
              min={0.5}
              max={3}
              step={0.1}
              unit="倍"
              onChange={(v) => setParams(p => ({ ...p, diffusion: v }))}
            />
            <Slider
              label="颜色饱和度"
              value={params.saturation}
              min={0.5}
              max={2}
              step={0.1}
              unit="倍"
              onChange={(v) => setParams(p => ({ ...p, saturation: v }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
