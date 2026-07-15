package com.murphy.qualification;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MessageNormalizer {
  /**
   * Qualification fixture: normalizes inbound consumer messages.
   * Seeded defect in v1: trims but does not lower-case (Lead/Judge cases).
   */
  public String normalize(String input) {
    if (input == null) {
      return "";
    }
    return input.trim();
  }

  public boolean isBlank(String input) {
    return normalize(input).isEmpty();
  }
}
