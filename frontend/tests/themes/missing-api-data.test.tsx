import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MissingApiData } from "@/themes/dash/components/missing-api-data";

describe("Missing API data indicator", () => {
  it.each([{}, { inline: true }, { compact: true }])("keeps explanations in an accessible popover: %j", (props) => {
    const markup = renderToString(<MissingApiData {...props} description="Historical data is not available." />);
    expect(markup).toContain("API pending");
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("Historical data is not available.");
    expect(markup).not.toContain("<details");
  });
});
