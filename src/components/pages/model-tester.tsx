'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IMAGE_MODEL_SCHEMAS, type ImageModelId } from '@/schemas/image-models';
import { testModel, testAllModelsWithPrompt, type TestResult } from '@/utils/image-model-tester';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckIcon, XIcon, ClockIcon, PlayIcon } from 'lucide-react';

interface ModelTesterProps {
  onClose: () => void;
}

export function ModelTester({ onClose }: ModelTesterProps) {
  const [testPrompt, setTestPrompt] = useState('A cyberpunk cat');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('');

  const handleTestAllModels = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentModel('');

    try {
      const results: TestResult[] = [];

      for (const modelId of Object.keys(IMAGE_MODEL_SCHEMAS) as ImageModelId[]) {
        setCurrentModel(modelId);

        const result = await testModel(modelId, testPrompt);
        results.push(result);
        setTestResults([...results]);

        // Add delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentModel('');
    }
  };

  const handleTestSingleModel = async (modelId: ImageModelId) => {
    setIsRunning(true);
    setCurrentModel(modelId);

    try {
      const result = await testModel(modelId, testPrompt);
      setTestResults((prev) => {
        const filtered = prev.filter((r) => r.modelId !== modelId);
        return [...filtered, result];
      });
    } catch (error) {
      console.error(`Test failed for ${modelId}:`, error);
    } finally {
      setIsRunning(false);
      setCurrentModel('');
    }
  };

  const getModelResult = (modelId: ImageModelId) => {
    return testResults.find((r) => r.modelId === modelId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border shadow-lg">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Image Model Tester</h2>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Test Prompt</label>
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="bg-background mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Enter a prompt to test all models..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTestAllModels}
                disabled={isRunning || !testPrompt.trim()}
                className="flex items-center gap-2"
              >
                <PlayIcon size={16} />
                Test All Models
              </Button>

              {isRunning && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <ClockIcon size={16} className="animate-spin" />
                  {currentModel ? `Testing ${currentModel}...` : 'Running tests...'}
                </div>
              )}
            </div>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {Object.entries(IMAGE_MODEL_SCHEMAS).map(([modelId, schema]) => {
              const result = getModelResult(modelId as ImageModelId);
              const isTesting = isRunning && currentModel === modelId;

              return (
                <div key={modelId} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{schema.name}</h3>
                        <span className="text-muted-foreground text-xs">{schema.provider}</span>
                        {schema.isPartner && (
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                            Partner
                          </span>
                        )}
                        {'isBeta' in schema && schema.isBeta && (
                          <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                            Beta
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">{schema.description}</p>
                      <div className="text-muted-foreground mt-2 text-xs">
                        <span className="font-medium">Capabilities:</span>{' '}
                        {schema.capabilities.join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {result && (
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <>
                              <CheckIcon size={16} className="text-green-600" />
                              <span className="text-sm text-green-600">
                                {result.responseTime}ms
                              </span>
                            </>
                          ) : (
                            <>
                              <XIcon size={16} className="text-red-600" />
                              <span className="text-xs text-red-600" title={result.error}>
                                Failed
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {isTesting ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestSingleModel(modelId as ImageModelId)}
                          disabled={isRunning || !testPrompt.trim()}
                        >
                          Test
                        </Button>
                      )}
                    </div>
                  </div>

                  {result && result.error && (
                    <div className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
