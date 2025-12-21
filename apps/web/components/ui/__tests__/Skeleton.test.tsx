import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "@medbook/ui";

describe("Skeleton", () => {
  it("renders skeleton component", () => {
    render(<Skeleton />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).toBeInTheDocument();
  });

  it("has proper ARIA attributes", () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-label", "Loading...");
  });

  it("applies custom className", () => {
    render(<Skeleton className="custom-class" />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).toHaveClass("custom-class");
  });

  it("renders text variant", () => {
    render(<Skeleton variant="text" />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).toHaveClass("rounded");
  });

  it("renders circular variant", () => {
    render(<Skeleton variant="circular" />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).toHaveClass("rounded-full");
  });

  it("renders rectangular variant", () => {
    render(<Skeleton variant="rectangular" />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).toHaveClass("rounded");
  });

  it("applies custom width and height", () => {
    render(<Skeleton width={100} height={50} />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).toHaveStyle({ width: "100px", height: "50px" });
  });

  it("applies pulse animation by default", () => {
    render(<Skeleton />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).toHaveClass("animate-pulse");
  });

  it("applies wave animation when specified", () => {
    render(<Skeleton animation="wave" />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).toHaveClass("animate-[shimmer_2s_infinite]");
  });

  it("applies no animation when specified", () => {
    render(<Skeleton animation="none" />);
    const skeleton = screen.getByLabelText("Loading...");
    expect(skeleton).not.toHaveClass("animate-pulse");
    expect(skeleton).not.toHaveClass("animate-[shimmer_2s_infinite]");
  });
});
