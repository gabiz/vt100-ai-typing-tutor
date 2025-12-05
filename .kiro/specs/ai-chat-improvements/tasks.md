# Implementation Plan

- [x] 1. Update AI service model configuration
  - Update model identifier from claude-3-haiku-20240307 to claude-haiku-4-5-20251001
  - Verify API connectivity with the new model endpoint
  - _Requirements: 5.1, 5.2_

- [x] 2. Create structured response interfaces and types
  - [x] 2.1 Define StructuredAIResponse interface
    - Create interface with intent, typing-text, and response fields
    - Add type definitions for intent values (chitchat, session-analysis, session-suggest)
    - _Requirements: 4.2_

  - [x] 2.2 Define ChatMessage interface for conversation history
    - Create interface with role, content, and timestamp fields
    - Add type definitions for message roles (user, assistant)
    - _Requirements: 8.1_

  - [ ]* 2.3 Write property test for JSON response structure validity
    - **Property 1: JSON Response Structure Validity**
    - **Validates: Requirements 4.1, 4.2, 4.5**

- [x] 3. Implement enhanced chat method with comprehensive prompting
  - [x] 3.1 Create chatWithUserEnhanced method
    - Implement single AI call with structured JSON response handling
    - Create comprehensive system prompt for intent detection and response generation
    - Add JSON parsing and validation logic
    - _Requirements: 1.1, 1.2, 4.1, 4.2_

  - [x] 3.2 Implement conversation context management
    - Add logic to include last 5 messages in prompt context
    - Format conversation history appropriately for the AI model
    - Handle cases with no previous conversation history
    - _Requirements: 8.1, 8.4_

  - [ ]* 3.3 Write property test for conversation context inclusion
    - **Property 6: Conversation Context Inclusion**
    - **Validates: Requirements 8.1, 8.4**

- [x] 4. Implement intent-specific response handling
  - [x] 4.1 Add intent classification and response logic
    - Implement chitchat response handling with typing focus redirection
    - Add session-analysis response with performance insights
    - Create session-suggest response with typing exercise generation
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Implement typing-text field management
    - Ensure null typing-text for chitchat and session-analysis intents
    - Generate valid typing exercise content for session-suggest intent
    - _Requirements: 4.3, 4.4_

  - [ ]* 4.3 Write property test for intent classification and response behavior
    - **Property 2: Intent Classification and Response Behavior**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [ ]* 4.4 Write property test for typing text field consistency
    - **Property 3: Typing Text Field Consistency**
    - **Validates: Requirements 4.3, 4.4, 6.3, 7.5**

- [x] 5. Implement precise word count generation
  - [x] 5.1 Add word count extraction and validation
    - Parse user requests for specific word count requirements
    - Implement exact word count generation through AI prompting
    - Add fallback to 30-40 word range when no count specified
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 5.2 Write property test for word count precision
    - **Property 4: Word Count Precision**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 6. Implement key drill generation
  - [x] 6.1 Add key drill detection and generation
    - Detect requests for specific key practice
    - Generate drill text using only specified keys and spaces
    - Create varied patterns while maintaining key exclusivity
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property test for key drill exclusivity
    - **Property 5: Key Drill Exclusivity**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 7. Implement performance analysis with context
  - [x] 7.1 Add performance data integration
    - Include performance history in AI prompt context
    - Generate specific improvement recommendations based on data
    - Reference actual performance metrics in analysis responses
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 7.2 Write property test for performance analysis context usage
    - **Property 7: Performance Analysis Context Usage**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 8. Add error handling and fallback mechanisms
  - [x] 8.1 Implement JSON parsing error handling
    - Add validation for AI response structure
    - Implement fallback to current chat system on parsing failures
    - Add retry logic for malformed responses
    - _Requirements: 4.1, 4.5_

  - [x] 8.2 Add graceful degradation for API failures
    - Implement fallback to existing AI service methods
    - Add appropriate error messages for service unavailability
    - Maintain user experience during temporary failures
    - _Requirements: 5.2_

- [ ]* 8.3 Write property test for model configuration consistency
  - **Property 8: Model Configuration Consistency**
  - **Validates: Requirements 5.1, 5.2**

- [x] 9. Update existing chat integration
  - [x] 9.1 Modify AIChat component to use enhanced service
    - Update component to handle structured AI responses
    - Integrate new chatWithUserEnhanced method
    - Maintain backward compatibility with existing functionality
    - _Requirements: 5.5_

  - [x] 9.2 Add conversation history management to chat component
    - Store and manage last 5 messages for context
    - Pass conversation history to enhanced AI service
    - Handle message display and formatting
    - _Requirements: 8.1, 8.2_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Integration testing and validation
  - [ ] 11.1 Test complete user interaction flows
    - Verify chitchat redirection works correctly
    - Test session analysis with real performance data
    - Validate typing exercise generation with various requirements
    - _Requirements: All requirements_

  - [ ] 11.2 Validate model upgrade benefits
    - Compare intent detection accuracy with previous system
    - Verify improved response quality and relevance
    - Test edge cases and error scenarios
    - _Requirements: 5.3_

- [ ] 12. Final checkpoint - Complete testing and validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify npm run build and npm run lint pass successfully
  - Test complete enhanced AI chat workflow from user message to structured response