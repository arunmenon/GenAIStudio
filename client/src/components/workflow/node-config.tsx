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

const aiTransformConfigSchema = z.object({
  systemPrompt: z.string().min(1, "System prompt is required"),
  input: z.string(),
  maxTokens: z.number().int().min(1).max(4000).default(1000),
});

const codeConfigSchema = z.object({
  code: z.string().min(1, "Code is required"),
});

const loopConfigSchema = z.object({
  input: z.string().min(1, "Input field is required"),
  maxIterations: z.number().int().min(1).default(10),
});

const webhookConfigSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  path: z.string().min(1, "Path is required"),
});

export default function NodeConfig({ nodeId, nodeType, config, onConfigChange }: NodeConfigProps) {
  // Select schema based on node type
  const getSchemaForType = (type: NodeType) => {
    switch (type) {
      case "schedule_trigger":
        return scheduleConfigSchema;
      case "basic_llm_chain":
        return llmChainConfigSchema;
      case "ai_transform":
        return aiTransformConfigSchema;
      case "code":
        return codeConfigSchema;
      case "loop":
        return loopConfigSchema;
      case "webhook_trigger":
        return webhookConfigSchema;
      default:
        return z.object({});
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchemaForType(nodeType)),
    defaultValues: config,
  });

  useEffect(() => {
    form.reset(config);
  }, [config, form]);

  const onSubmit = (data: Record<string, any>) => {
    onConfigChange(nodeId, data);
  };

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

      case "ai_transform":
        return (
          <>
            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter system prompt..." {...field} />
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

      case "code":
        return (
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>JavaScript Code</FormLabel>
                <FormControl>
                  <Textarea
                    className="font-mono"
                    rows={10}
                    placeholder="Enter your code..."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );

      case "loop":
        return (
          <>
            <FormField
              control={form.control}
              name="input"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Input Field</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter input field name..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxIterations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Iterations</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        );

      case "webhook_trigger":
        return (
          <>
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path</FormLabel>
                  <FormControl>
                    <Input placeholder="/webhook/my-endpoint" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        );

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
