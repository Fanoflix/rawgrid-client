import { ToolBaseContainer } from "@/components/tool-base-container";
import { TopNavbar } from "@/components/top-navbar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ColorPickerTool } from "@/tools/color-picker/color-picker";
import { JwtDecoderTool } from "@/tools/jwt-decoder/jwt-decoder";
import { QuickRememberTool } from "@/tools/quick-remember/quick-remember";
import { StackedTextareasTool } from "@/tools/stacked-textareas/stacked-textareas";
import { UnixTimestampTool } from "@/tools/unix-timestamp/unix-timestamp";
import { YouTubePlayerTool } from "@/tools/youtube-player/youtube-player";

export function App() {
  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground">
      <TopNavbar />
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup
          direction="vertical"
          className="overflow-y-auto min-h-full w-full max-w-screen"
        >
          <ResizablePanel defaultSize={50} minSize={25}>
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full w-full"
            >
              <ResizablePanel defaultSize={34} minSize={20}>
                <ToolBaseContainer>
                  <JwtDecoderTool />
                </ToolBaseContainer>
              </ResizablePanel>

              <ResizableHandle />

              <ResizablePanel defaultSize={33} minSize={20}>
                <ToolBaseContainer>
                  <UnixTimestampTool />
                </ToolBaseContainer>
              </ResizablePanel>

              <ResizableHandle />

              <ResizablePanel defaultSize={12} minSize={4}>
                <ToolBaseContainer>
                  <ColorPickerTool />
                </ToolBaseContainer>
              </ResizablePanel>

              <ResizableHandle />

              <ResizablePanel defaultSize={40} minSize={20}>
                <ToolBaseContainer>
                  <YouTubePlayerTool />
                </ToolBaseContainer>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize="32px" minSize="32px" maxSize="32px">
            <ToolBaseContainer>
              <QuickRememberTool />
            </ToolBaseContainer>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={50} minSize={25}>
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full w-full"
            >
              <ResizablePanel defaultSize={60} minSize={30}>
                <ToolBaseContainer>
                  <StackedTextareasTool />
                </ToolBaseContainer>
              </ResizablePanel>

              {/* More tools go here */}
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default App;
