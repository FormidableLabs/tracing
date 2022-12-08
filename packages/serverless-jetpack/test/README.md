trace-pkg Tests
===============

Here's a quick guide to our various test directories:

- `e2e`: Tests the entire application at the CLI level using the **real** file system. Expected to be slower than all other tests.
- `lib`: Unit tests of specific library code using a mocked file system.
