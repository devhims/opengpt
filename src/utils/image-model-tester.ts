/**
 * Image Model Testing Utility
 *
 * Comprehensive testing framework for Cloudflare Workers AI image generation models.
 * Provides systematic testing, performance benchmarking, and quality assessment.
 */

import {
  IMAGE_MODEL_SCHEMAS,
  type ImageModelId,
  getOptimalParams,
  getModelsByPerformance,
  getRecommendedModels,
  TEST_CONFIGURATIONS,
  getModelsByCapability,
  ModelCapability,
} from '@/schemas/image-models';
import { generateImage } from './image';

// Note: React types are available globally

// ============================================================================
// Test Result Interfaces
// ============================================================================

export interface TestResult {
  modelId: ImageModelId;
  prompt: string;
  params: Record<string, any>;
  success: boolean;
  responseTime: number;
  error?: string;
  imageData?: {
    base64: string;
    mediaType: string;
    uint8Array: number[];
  };
  performanceScore?: number; // 0-100 based on response time vs expected
}

export interface ModelTestSuite {
  modelId: ImageModelId;
  results: TestResult[];
  successRate: number;
  averageResponseTime: number;
  averagePerformanceScore: number;
  errors: string[];
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TestProgress {
  currentModel: string;
  completedTests: number;
  totalTests: number;
  currentPrompt: string;
  elapsedTime: number;
}

// ============================================================================
// Core Testing Functions
// ============================================================================

/**
 * Calculate performance score based on response time vs expected performance
 */
function calculatePerformanceScore(responseTime: number, expectedTime: string): number {
  // Parse expected time range (e.g., "2-4s" -> average 3s)
  const match = expectedTime.match(/(\d+)-(\d+)s/);
  if (!match) return 50; // Default score if can't parse

  const minTime = parseInt(match[1]) * 1000; // Convert to ms
  const maxTime = parseInt(match[2]) * 1000;
  const avgExpected = (minTime + maxTime) / 2;

  // Score: 100 if under min, 0 if over max*2, linear between
  if (responseTime <= minTime) return 100;
  if (responseTime >= maxTime * 2) return 0;

  return Math.max(0, 100 - ((responseTime - minTime) / (maxTime - minTime)) * 100);
}

/**
 * Enhanced test function with better error handling and performance scoring
 */
export async function testModel(
  modelId: ImageModelId,
  prompt: string,
  customParams: Record<string, any> = {},
  onProgress?: (progress: Partial<TestProgress>) => void,
): Promise<TestResult> {
  const startTime = Date.now();
  const schema = IMAGE_MODEL_SCHEMAS[modelId];

  onProgress?.({
    currentModel: schema.name,
    currentPrompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
  });

  try {
    // Get optimal parameters with validation
    const optimalParams = getOptimalParams(modelId, { prompt, ...customParams });

    // Validate parameters against schema ranges
    if (schema.paramRanges) {
      Object.entries(optimalParams).forEach(([key, value]) => {
        const range = schema.paramRanges?.[key as keyof typeof schema.paramRanges];
        if (range && typeof range === 'object' && typeof value === 'number') {
          if ('min' in range && range.min !== undefined && value < range.min) {
            optimalParams[key] = range.min;
          }
          if ('max' in range && range.max !== undefined && value > range.max) {
            optimalParams[key] = range.max;
          }
        }
      });
    }

    console.log(`🧪 Testing ${schema.name} (${modelId})`);
    console.log(`📝 Prompt: "${prompt}"`);
    console.log(`⚙️  Parameters:`, optimalParams);

    // Use the generateImage function which now handles optimal parameters
    const result = await generateImage(
      prompt,
      modelId,
      optimalParams.steps || optimalParams.num_steps || schema.performance.recommendedSteps,
    );

    const responseTime = Date.now() - startTime;
    const performanceScore = calculatePerformanceScore(
      responseTime,
      schema.performance.estimatedResponseTime,
    );

    console.log(`✅ Success! ${responseTime}ms (score: ${performanceScore.toFixed(0)})`);

    return {
      modelId,
      prompt,
      params: optimalParams,
      success: true,
      responseTime,
      performanceScore,
      imageData: result,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`❌ Failed: ${errorMessage} (${responseTime}ms)`);

    return {
      modelId,
      prompt,
      params: customParams,
      success: false,
      responseTime,
      performanceScore: 0,
      error: errorMessage,
    };
  }
}

/**
 * Test all models with a single prompt, prioritizing by performance
 */
export async function testAllModelsWithPrompt(
  prompt: string,
  onProgress?: (progress: TestProgress) => void,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const modelIds = getModelsByPerformance(); // Start with fastest models
  const startTime = Date.now();

  for (let i = 0; i < modelIds.length; i++) {
    const modelId = modelIds[i];

    onProgress?.({
      currentModel: IMAGE_MODEL_SCHEMAS[modelId].name,
      completedTests: i,
      totalTests: modelIds.length,
      currentPrompt: prompt,
      elapsedTime: Date.now() - startTime,
    });

    const result = await testModel(modelId, prompt, {});
    results.push(result);

    // Adaptive delay based on model performance expectations
    const schema = IMAGE_MODEL_SCHEMAS[modelId];
    const delay = schema.performance.maxConcurrentRequests > 3 ? 500 : 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return results;
}

/**
 * Calculate quality grade based on success rate and performance
 */
function calculateQualityGrade(
  successRate: number,
  averagePerformanceScore: number,
): 'A' | 'B' | 'C' | 'D' | 'F' {
  const combined = (successRate + averagePerformanceScore) / 2;

  if (combined >= 90) return 'A';
  if (combined >= 80) return 'B';
  if (combined >= 70) return 'C';
  if (combined >= 60) return 'D';
  return 'F';
}

/**
 * Enhanced comprehensive test suite for a specific model
 */
export async function runModelTestSuite(
  modelId: ImageModelId,
  onProgress?: (progress: TestProgress) => void,
): Promise<ModelTestSuite> {
  const results: TestResult[] = [];
  const schema = IMAGE_MODEL_SCHEMAS[modelId];
  const startTime = Date.now();
  let testCount = 0;

  console.log(`\n🚀 Starting comprehensive test suite for ${schema.name}`);

  // Calculate total tests for progress tracking
  const totalTests =
    TEST_CONFIGURATIONS.basicPrompts.length +
    TEST_CONFIGURATIONS.performancePrompts.length +
    (schema.paramRanges ? 10 : 0); // Estimate parameter tests

  // Test with basic prompts
  console.log('📋 Testing basic prompts...');
  for (const prompt of TEST_CONFIGURATIONS.basicPrompts) {
    onProgress?.({
      currentModel: schema.name,
      completedTests: testCount++,
      totalTests,
      currentPrompt: prompt,
      elapsedTime: Date.now() - startTime,
    });

    const result = await testModel(modelId, prompt, {});
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Test with performance prompts (different complexity levels)
  console.log('⚡ Testing performance prompts...');
  for (const prompt of TEST_CONFIGURATIONS.performancePrompts) {
    onProgress?.({
      currentModel: schema.name,
      completedTests: testCount++,
      totalTests,
      currentPrompt: prompt,
      elapsedTime: Date.now() - startTime,
    });

    const result = await testModel(modelId, prompt, {});
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Test parameter variations (if supported)
  if (schema.paramRanges) {
    console.log('🔧 Testing parameter variations...');
    const testPrompt = TEST_CONFIGURATIONS.basicPrompts[0];

    // Test guidance variations
    if ('guidance' in schema.paramRanges) {
      const guidanceRange = schema.paramRanges.guidance;
      if (guidanceRange && typeof guidanceRange === 'object') {
        for (const guidance of TEST_CONFIGURATIONS.parameterTests.guidance) {
          const { min = 0, max = 15 } = guidanceRange;
          if (guidance >= min && guidance <= max) {
            const result = await testModel(modelId, testPrompt, { guidance });
            results.push(result);
            testCount++;
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }
    }

    // Test step variations
    const stepParam = 'num_steps' in schema.paramRanges ? 'num_steps' : 'steps';
    const stepRange = schema.paramRanges[stepParam as keyof typeof schema.paramRanges];
    if (stepRange && typeof stepRange === 'object') {
      for (const steps of TEST_CONFIGURATIONS.parameterTests.steps) {
        const { min = 1, max = 50 } = stepRange;
        if (steps >= min && steps <= max) {
          const params = { [stepParam]: steps };
          const result = await testModel(modelId, testPrompt, params);
          results.push(result);
          testCount++;
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }

    // Test dimension variations
    if ('width' in schema.paramRanges && 'height' in schema.paramRanges) {
      const widthRange = schema.paramRanges.width;
      const heightRange = schema.paramRanges.height;

      if (
        widthRange &&
        heightRange &&
        typeof widthRange === 'object' &&
        typeof heightRange === 'object'
      ) {
        for (const dimensions of TEST_CONFIGURATIONS.parameterTests.dimensions.slice(0, 3)) {
          const { width, height } = dimensions;
          if (
            width >= (widthRange.min || 256) &&
            width <= (widthRange.max || 2048) &&
            height >= (heightRange.min || 256) &&
            height <= (heightRange.max || 2048)
          ) {
            const result = await testModel(modelId, testPrompt, { width, height });
            results.push(result);
            testCount++;
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }
    }
  }

  // Calculate metrics
  const successfulResults = results.filter((r) => r.success);
  const failedResults = results.filter((r) => !r.success);
  const successRate = results.length > 0 ? (successfulResults.length / results.length) * 100 : 0;
  const averageResponseTime =
    successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length
      : 0;
  const averagePerformanceScore =
    successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + (r.performanceScore || 0), 0) /
        successfulResults.length
      : 0;

  const qualityGrade = calculateQualityGrade(successRate, averagePerformanceScore);

  console.log(`✅ Test suite completed for ${schema.name}`);
  console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`⏱️  Average Response Time: ${averageResponseTime.toFixed(0)}ms`);
  console.log(`🎯 Performance Score: ${averagePerformanceScore.toFixed(0)}`);
  console.log(`🏆 Quality Grade: ${qualityGrade}`);

  return {
    modelId,
    results,
    successRate,
    averageResponseTime,
    averagePerformanceScore,
    qualityGrade,
    errors: failedResults.map((r) => r.error || 'Unknown error'),
  };
}

/**
 * Run tests for all models with progress tracking and smart ordering
 */
export async function runFullTestSuite(
  onProgress?: (progress: TestProgress & { overallProgress: number }) => void,
): Promise<ModelTestSuite[]> {
  const suites: ModelTestSuite[] = [];
  const modelIds = getModelsByPerformance(); // Start with fastest models
  const startTime = Date.now();

  console.log('🚀 Starting full test suite for all models...');
  console.log(`📋 Testing ${modelIds.length} models in performance order`);

  for (let i = 0; i < modelIds.length; i++) {
    const modelId = modelIds[i];
    const schema = IMAGE_MODEL_SCHEMAS[modelId];

    console.log(`\n🧪 [${i + 1}/${modelIds.length}] Testing ${schema.name}...`);

    const suite = await runModelTestSuite(modelId, (testProgress) => {
      onProgress?.({
        ...testProgress,
        overallProgress:
          ((i + testProgress.completedTests / testProgress.totalTests) / modelIds.length) * 100,
      });
    });

    suites.push(suite);

    console.log(
      `🎯 ${schema.name} Grade: ${suite.qualityGrade} (${suite.successRate.toFixed(1)}% success)`,
    );

    // Adaptive delay based on model performance and errors
    const delay = suite.errors.length > 0 ? 3000 : 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n🏁 Full test suite completed in ${(totalTime / 1000).toFixed(1)}s`);

  // Print summary
  const avgSuccessRate = suites.reduce((sum, s) => sum + s.successRate, 0) / suites.length;
  const gradeDistribution = suites.reduce(
    (acc, s) => {
      acc[s.qualityGrade] = (acc[s.qualityGrade] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(`📊 Overall Success Rate: ${avgSuccessRate.toFixed(1)}%`);
  console.log(`🏆 Grade Distribution:`, gradeDistribution);

  return suites;
}

/**
 * Generate enhanced test report with performance insights
 */
export function generateTestReport(suites: ModelTestSuite[]): string {
  let report = '# 🎨 Image Model Test Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Models Tested:** ${suites.length}\n\n`;

  // Executive Summary
  const avgSuccessRate = suites.reduce((sum, s) => sum + s.successRate, 0) / suites.length;
  const avgResponseTime = suites.reduce((sum, s) => sum + s.averageResponseTime, 0) / suites.length;
  const avgPerformanceScore =
    suites.reduce((sum, s) => sum + s.averagePerformanceScore, 0) / suites.length;

  report += '## 📈 Executive Summary\n\n';
  report += `- **Overall Success Rate:** ${avgSuccessRate.toFixed(1)}%\n`;
  report += `- **Average Response Time:** ${avgResponseTime.toFixed(0)}ms\n`;
  report += `- **Average Performance Score:** ${avgPerformanceScore.toFixed(0)}/100\n\n`;

  // Top Performers
  const topPerformers = suites
    .filter((s) => s.qualityGrade === 'A' || s.qualityGrade === 'B')
    .sort((a, b) => b.averagePerformanceScore - a.averagePerformanceScore)
    .slice(0, 3);

  if (topPerformers.length > 0) {
    report += '## 🏆 Top Performing Models\n\n';
    topPerformers.forEach((suite, index) => {
      const schema = IMAGE_MODEL_SCHEMAS[suite.modelId];
      report += `${index + 1}. **${schema.name}** (Grade ${suite.qualityGrade}) - ${suite.successRate.toFixed(1)}% success, ${suite.averageResponseTime.toFixed(0)}ms avg\n`;
    });
    report += '\n';
  }

  // Summary table with enhanced metrics
  report += '## 📊 Model Performance Overview\n\n';
  report +=
    '| Model | Provider | Grade | Success Rate | Avg Time | Perf Score | Tests | Errors |\n';
  report +=
    '|-------|----------|-------|--------------|----------|------------|-------|--------|\n';

  // Sort by quality grade and performance score
  const sortedSuites = [...suites].sort((a, b) => {
    const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    const gradeDiff = gradeOrder[b.qualityGrade] - gradeOrder[a.qualityGrade];
    return gradeDiff !== 0 ? gradeDiff : b.averagePerformanceScore - a.averagePerformanceScore;
  });

  for (const suite of sortedSuites) {
    const schema = IMAGE_MODEL_SCHEMAS[suite.modelId];
    const gradeEmoji = { A: '🥇', B: '🥈', C: '🥉', D: '🔶', F: '🔴' }[suite.qualityGrade];
    report += `| ${schema.name} | ${schema.provider} | ${gradeEmoji} ${suite.qualityGrade} | ${suite.successRate.toFixed(1)}% | ${suite.averageResponseTime.toFixed(0)}ms | ${suite.averagePerformanceScore.toFixed(0)} | ${suite.results.length} | ${suite.errors.length} |\n`;
  }

  // Recommendations
  report += '\n## 💡 Recommendations\n\n';

  const recommendations = getRecommendedModels();
  const fastestModels = recommendations.fastest;
  const highQualityModels = recommendations.highQuality;

  report += '### ⚡ For Speed\n';
  fastestModels.forEach((modelId) => {
    const schema = IMAGE_MODEL_SCHEMAS[modelId as ImageModelId];
    const suite = suites.find((s) => s.modelId === modelId);
    if (suite && suite.successRate > 80) {
      report += `- **${schema.name}**: ${suite.averageResponseTime.toFixed(0)}ms average, ${suite.successRate.toFixed(1)}% success\n`;
    }
  });

  report += '\n### 🎯 For Quality\n';
  highQualityModels.forEach((modelId) => {
    const schema = IMAGE_MODEL_SCHEMAS[modelId as ImageModelId];
    const suite = suites.find((s) => s.modelId === modelId);
    if (suite && suite.qualityGrade === 'A') {
      report += `- **${schema.name}**: Grade ${suite.qualityGrade}, ${suite.averagePerformanceScore.toFixed(0)} performance score\n`;
    }
  });

  // Detailed results
  report += '\n## 📋 Detailed Results\n\n';

  for (const suite of sortedSuites) {
    const schema = IMAGE_MODEL_SCHEMAS[suite.modelId];
    const gradeEmoji = { A: '🥇', B: '🥈', C: '🥉', D: '🔶', F: '🔴' }[suite.qualityGrade];

    report += `### ${gradeEmoji} ${schema.name} (${suite.modelId})\n\n`;
    report += `- **Provider:** ${schema.provider}\n`;
    report += `- **Capabilities:** ${schema.capabilities.join(', ')}\n`;
    report += `- **Quality Grade:** ${suite.qualityGrade}\n`;
    report += `- **Success Rate:** ${suite.successRate.toFixed(1)}%\n`;
    report += `- **Average Response Time:** ${suite.averageResponseTime.toFixed(0)}ms\n`;
    report += `- **Performance Score:** ${suite.averagePerformanceScore.toFixed(0)}/100\n`;
    report += `- **Total Tests:** ${suite.results.length}\n`;
    report += `- **Expected Response Time:** ${schema.performance.estimatedResponseTime}\n`;

    if (suite.errors.length > 0) {
      report += `- **Errors (${suite.errors.length}):**\n`;
      const uniqueErrors = [...new Set(suite.errors)];
      for (const error of uniqueErrors.slice(0, 3)) {
        // Limit to first 3 unique errors
        report += `  - ${error}\n`;
      }
      if (uniqueErrors.length > 3) {
        report += `  - ... and ${uniqueErrors.length - 3} more\n`;
      }
    }

    report += '\n';
  }

  return report;
}

/**
 * Quick test function for development and debugging
 */
export async function quickTest(
  modelId: ImageModelId,
  prompt: string = 'A cyberpunk cat with neon lights',
): Promise<void> {
  const schema = IMAGE_MODEL_SCHEMAS[modelId];
  console.log(`🚀 Quick testing ${schema.name} (${modelId})...`);
  console.log(`📝 Prompt: "${prompt}"`);

  const result = await testModel(modelId, prompt);

  if (result.success) {
    console.log(`✅ Success! Response time: ${result.responseTime}ms`);
    console.log(`🎯 Performance Score: ${result.performanceScore?.toFixed(0) || 'N/A'}`);
    console.log(`📸 Image generated successfully (${result.imageData?.mediaType})`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
    console.log(`⏱️  Failed after: ${result.responseTime}ms`);
  }
}

/**
 * Test specific models by capability
 */
export async function testModelsByCapability(
  capability: ModelCapability,
  prompt: string = 'Test image generation',
  onProgress?: (progress: TestProgress) => void,
): Promise<TestResult[]> {
  const modelIds = getModelsByCapability(capability);
  const results: TestResult[] = [];
  const startTime = Date.now();

  console.log(`🎯 Testing ${modelIds.length} models with '${capability}' capability`);

  for (let i = 0; i < modelIds.length; i++) {
    const modelId = modelIds[i];

    onProgress?.({
      currentModel: IMAGE_MODEL_SCHEMAS[modelId].name,
      completedTests: i,
      totalTests: modelIds.length,
      currentPrompt: prompt,
      elapsedTime: Date.now() - startTime,
    });

    const result = await testModel(modelId, prompt, {});
    results.push(result);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
