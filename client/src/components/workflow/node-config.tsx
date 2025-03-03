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
import { ChevronRight } from "lucide-react";
import { type NodeType } from "@shared/types";

interface NodeConfigProps {
  nodeId: string;
  nodeType: NodeType;
  config: Record<string, any>;
  onConfigChange: (nodeId: string, config: Record<string, any>) => void;
  onNextStep?: () => void;
}

// Define all schemas first
const scheduleConfigSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
  hour: z.string(),
  minute: z.string(),
  dayOfWeek: z.string().optional(),
  dayOfMonth: z.string().optional(),
  timezone: z.string().default("UTC"),
});

const llmChainConfigSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  maxTokens: z.number().int().min(1).max(4000).default(1000),
});

const codeConfigSchema = z.object({
  language: z.enum(["javascript", "python"]),
  mode: z.enum(["Run Once", "Run Once for All Items", "Run for Each Item"]),
  code: z.string().min(1, "Code is required"),
});

// Helper function to get schema based on node type
const getSchemaForType = (type: NodeType) => {
  switch (type) {
    case "schedule_trigger":
      return scheduleConfigSchema;
    case "basic_llm_chain":
      return llmChainConfigSchema;
    case "code":
      return codeConfigSchema;
    default:
      return z.object({});
  }
};

// Helper to convert the natural schedule to cron expression
const convertToCron = (data: any): string => {
  const { frequency, hour, minute, dayOfWeek, dayOfMonth } = data;
  const h = hour.padStart(2, '0');
  const m = minute.padStart(2, '0');

  switch (frequency) {
    case "daily":
      return `${m} ${h} * * *`;
    case "weekly":
      return `${m} ${h} * * ${dayOfWeek}`;
    case "monthly":
      return `${m} ${h} ${dayOfMonth} * *`;
    default:
      return "0 0 * * *";
  }
};

export default function NodeConfig({ nodeId, nodeType, config, onConfigChange, onNextStep }: NodeConfigProps) {
  const form = useForm({
    resolver: zodResolver(getSchemaForType(nodeType)),
    defaultValues: {
      frequency: "daily",
      hour: "0",
      minute: "0",
      timezone: "UTC",
      ...(config || {}),
    },
  });

  useEffect(() => {
    console.log('Loading config:', config);
    if (config && Object.keys(config).length > 0) {
      form.reset(config);
    }
  }, [config, form]);

  const onSubmit = (data: Record<string, any>) => {
    console.log('Submitting schedule config:', data);

    if (nodeType === "schedule_trigger") {
      // Convert the natural schedule to cron expression
      const cronExpression = convertToCron(data);
      onConfigChange(nodeId, {
        ...data,
        schedule: cronExpression,
      });
    } else {
      onConfigChange(nodeId, data);
    }
  };

  const renderScheduleTrigger = () => (
    <>
      <FormField
        control={form.control}
        name="frequency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Frequency</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="hour"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hour (0-23)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="minute"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minute (0-59)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select minute" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 60 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      {form.watch("frequency") === "weekly" && (
        <FormField
          control={form.control}
          name="dayOfWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Day of Week</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || "1"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      )}

      {form.watch("frequency") === "monthly" && (
        <FormField
          control={form.control}
          name="dayOfMonth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Day of Month</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || "1"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      )}

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

  const renderLLMChainNode = () => (
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
  );

  const renderFields = () => {
    switch (nodeType) {
      case "schedule_trigger":
        return renderScheduleTrigger();
      case "code":
        return renderCodeNode();
      case "basic_llm_chain":
        return renderLLMChainNode();
      default:
        return null;
    }
  };

  return (
    <Card className="w-96">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Node Configuration</CardTitle>
        {onNextStep && (
          <Button variant="ghost" size="sm" onClick={onNextStep}>
            Next Step <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {renderFields()}
            <Button type="submit" className="w-full">Save Configuration</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}