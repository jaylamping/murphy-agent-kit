package com.murphy.qualification;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class MessageNormalizerTest {
  private final MessageNormalizer normalizer = new MessageNormalizer();

  @Test
  void trimsWhitespace() {
    Assertions.assertEquals("abc", normalizer.normalize("  abc  "));
  }

  @Test
  void blankDetection() {
    Assertions.assertTrue(normalizer.isBlank("   "));
  }

  @Test
  void seededLowercaseExpectation() {
    // Intentionally fails against current implementation (seeded Lead fix case).
    // Qualification harness expects Lead to fix normalize to lower-case.
    Assertions.assertEquals("abc", normalizer.normalize("ABC"));
  }
}
