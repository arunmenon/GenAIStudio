import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type NodeType } from "@shared/types";

interface NodeConfigProps {
  nodeId: string;
  nodeType: NodeType;
  config: Record<string, any>;
  onConfigChange: (nodeId: string, config: Record<string, any>) => void;
}

// Configuration schemas for different node types
const scheduleConfigSchema = z.object({
  schedule: z.string().min(1, "Schedule is required"),
  timezone: z.string().default("UTC"),
});

const llmChainConfigSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  maxTokens: z.number().int().min(1).max(4000).default(1000),
  temperature: z.number().min(0).max(1).default(0.7),
});

const extractorConfigSchema = z.object({
  template: z.string().min(1, "Template is required"),
  input: z.string().min(1, "Input field is required"),
});

const qaChainConfigSchema = z.object({
  question: z.string().min(1, "Question is required"),
  context: z.string().min(1, "Context is required"),
});

const sentimentConfigSchema = z.object({
  input: z.string().min(1, "Input text is required"),
  detailed: z.boolean().default(false),
});

const codeConfigSchema = z.object({
  language: z.enum(["javascript", "python"]),
  mode: z.enum(["Run Once", "Run Once for All Items", "Run for Each Item"]),
  code: z.string().min(1, "Code is required"),
});

export default function NodeConfig({ nodeId, nodeType, config, onConfigChange }: NodeConfigProps) {
  // Select schema based on node type
  const getSchemaForType = (type: NodeType) => {
    switch (type) {
      case "schedule_trigger":
        return scheduleConfigSchema;
      case "basic_llm_chain":
        return llmChainConfigSchema;
      case "information_extractor":
        return extractorConfigSchema;
      case "qa_chain":
        return qaChainConfigSchema;
      case "sentiment_analysis":
        return sentimentConfigSchema;
      case "code":
        return codeConfigSchema;
      default:
        return z.object({});
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchemaForType(nodeType)),
    defaultValues: {
      ...config,
      language: config.language || "javascript",
      mode: config.mode || "Run Once",
    },
  });

  useEffect(() => {
    form.reset(config);
  }, [config, form]);

  const onSubmit = (data: Record<string, any>) => {
    onConfigChange(nodeId, data);
  };

  const renderCodeNode = () => (
    <>
      <FormField
        control={form.control}
        name="mode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mode</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Run Once">Run Once</SelectItem>
                <SelectItem value="Run Once for All Items">Run Once for All Items</SelectItem>
                <SelectItem value="Run for Each Item">Run for Each Item</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="language"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Language</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python (Beta)</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Code</FormLabel>
            <FormControl>
              <Textarea
                className="font-mono h-48"
                placeholder={`Type $ for a list of special vars/methods.\nDebug by using console.log() statements.`}
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );

  const renderFields = () => {
    switch (nodeType) {
      case "schedule_trigger":
        return (
          <>
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule (Cron Expression)</FormLabel>
                  <FormControl>
                    <Input placeholder="*/5 * * * *" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a cron expression (e.g. "*/5 * * * *" for every 5 minutes)
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </>
        );

      case "basic_llm_chain":
        return (
          <>
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter your prompt..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Tokens</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min="0" max="1" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        );
      case "information_extractor":
        return (
          <>
            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter template..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="input"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Input</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter input field name..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        );
      case "qa_chain":
        return (
          <>
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter question..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter context..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        );
      case "sentiment_analysis":
        return (
          <>
            <FormField
              control={form.control}
              name="input"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Input Text</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter text..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="detailed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Analysis</FormLabel>
                  <FormControl>
                    <Input type="checkbox" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        );
      case "code":
        return renderCodeNode();
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Node Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {renderFields()}
            <Button type="submit">Save Configuration</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}