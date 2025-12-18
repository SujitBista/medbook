import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "../SectionHeader";

describe("SectionHeader", () => {
  it("renders the title", () => {
    render(<SectionHeader title="Featured Doctors" />);

    expect(screen.getByText("Featured Doctors")).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(
      <SectionHeader
        title="Featured Doctors"
        subtitle="Meet our top-rated specialists"
      />
    );

    expect(
      screen.getByText("Meet our top-rated specialists")
    ).toBeInTheDocument();
  });

  it("does not render subtitle when it is not provided", () => {
    render(<SectionHeader title="Featured Doctors" />);

    expect(
      screen.queryByText("Meet our top-rated specialists")
    ).not.toBeInTheDocument();
  });

  it("applies custom className to the root container", () => {
    render(<SectionHeader title="Featured Doctors" className="extra-margin" />);

    const container = screen.getByText("Featured Doctors").closest("div");
    expect(container).not.toBeNull();
    expect(container!.className).toContain("extra-margin");
  });
});
