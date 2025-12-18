import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, Input, Card } from "@medbook/ui";

describe("Shared UI components from @medbook/ui", () => {
  describe("Button", () => {
    it("renders children and supports click handler", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole("button", { name: "Click me" });
      expect(button).toBeInTheDocument();

      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies variant and size specific styles", () => {
      render(
        <Button variant="secondary" size="lg">
          Secondary
        </Button>
      );

      const button = screen.getByRole("button", { name: "Secondary" });

      // Basic sanity checks for a couple of key classes
      expect(button.className).toContain("bg-gray-600");
      expect(button.className).toContain("px-6");
    });

    it("does not call onClick when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      const button = screen.getByRole("button", { name: "Disabled" });
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Input", () => {
    it("renders label associated with the input", () => {
      render(
        <Input label="Email" type="email" placeholder="you@example.com" />
      );

      const input = screen.getByLabelText("Email");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "email");
    });

    it("shows error message and sets aria attributes", () => {
      render(
        <Input label="Password" type="password" error="Password is required" />
      );

      const input = screen.getByLabelText("Password");
      const errorMessage = screen.getByRole("alert");

      expect(errorMessage).toHaveTextContent("Password is required");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.getAttribute("aria-describedby") || "").toContain(
        errorMessage.id
      );
    });

    it("toggles password visibility when toggle button is clicked", async () => {
      const user = userEvent.setup();

      render(<Input label="Password" type="password" />);

      const input = screen.getByLabelText("Password") as HTMLInputElement;
      const toggleButton = screen.getByRole("button", {
        name: "Show password",
      });

      expect(input.type).toBe("password");

      await user.click(toggleButton);
      expect(input.type).toBe("text");

      // After toggling, aria-label should change as well
      expect(
        screen.getByRole("button", { name: "Hide password" })
      ).toBeInTheDocument();
    });

    it("does not toggle password visibility when disabled", async () => {
      const user = userEvent.setup();

      render(<Input label="Password" type="password" disabled />);

      const input = screen.getByLabelText("Password") as HTMLInputElement;
      const toggleButton = screen.getByRole("button", {
        name: "Show password",
      });

      expect(input.type).toBe("password");

      await user.click(toggleButton);
      expect(input.type).toBe("password");
    });
  });

  describe("Card", () => {
    it("renders title, children and footer", () => {
      render(
        <Card title="Card Title" footer={<span>Footer content</span>}>
          <p>Body content</p>
        </Card>
      );

      expect(screen.getByText("Card Title")).toBeInTheDocument();
      expect(screen.getByText("Body content")).toBeInTheDocument();
      expect(screen.getByText("Footer content")).toBeInTheDocument();
    });

    it("applies custom className to root element", () => {
      render(<Card className="custom-class">Content</Card>);

      const contentDiv = screen.getByText("Content").closest("div");
      const card = contentDiv?.parentElement;
      expect(card).not.toBeNull();
      expect(card!.className).toContain("custom-class");
    });
  });
});
