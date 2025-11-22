'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller, UseFormSetValue, UseFormGetValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, setDoc, writeBatch, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, PlusCircle, Trash2 } from 'lucide-react';
import type { Subject, Registration } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const schoolYearRegex = /^\d{4}-\d{4}$/;

const scheduleSchema = z.object({
  day: z.string(),
  startTime: z.string().min(1, { message: 'Required' }),
  endTime: z.string().min(1, { message: 'Required' }),
  room: z.string().min(1, { message: 'Required' }),
});

const subjectSchema = z.object({
  name: z.string().min(2, { message: 'Subject name must be at least 2 characters.' }),
  code: z.string().min(2, { message: 'Subject code is required.' }),
  description: z.string().optional(),
  schoolYear: z.string().regex(schoolYearRegex, { message: 'Invalid format. Use YYYY-YYYY.' }),
  yearLevel: z.string({ required_error: 'Please select a year level.' }),
  block: z.string().min(1, { message: 'Block is required.' }),
  credits: z.coerce.number().min(1, { message: 'Credit units are required.'}),
  hasLab: z.boolean(),
  lectureSchedules: z.array(scheduleSchema).min(1, { message: 'At least one lecture schedule is required.' }),
  labSchedules: z.array(scheduleSchema).optional(),
  enrollmentStatus: z.enum(['closed', 'open']),
}).refine(data => {
    if (data.hasLab) {
        return data.labSchedules && data.labSchedules.length > 0;
    }
    return true;
}, {
    message: "At least one laboratory schedule is required when 'Has Lab' is enabled.",
    path: ['labSchedules']
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AddSubjectFormProps {
  onSuccess: () => void;
  subject?: Subject | null;
}

const ScheduleArray = ({ control, setValue, getValues, name, label, description }: { control: any, setValue: UseFormSetValue<SubjectFormValues>, getValues: UseFormGetValues<SubjectFormValues>, name: "lectureSchedules" | "labSchedules", label: string, description: string }) => {
    const { fields, append, remove, update } = useFieldArray({ control, name });
    
    const handleDayCheckedChange = (checked: boolean, day: string) => {
        const fieldIndex = fields.findIndex(field => (field as any).day === day);
        if (checked && fieldIndex === -1) {
          append({ day, startTime: '', endTime: '', room: '' });
        } else if (!checked && fieldIndex > -1) {
          remove(fieldIndex);
        }
    };

    const handleCopySchedule = (targetDay: string) => {
      const allFormSchedules = getValues(name) as { day: string; startTime: string; endTime: string; room: string}[];
      const targetDayOrder = daysOfWeek.indexOf(targetDay);
      
      let sourceSchedule = null;

      // Search backwards from the target day to find the most recent checked day with a complete schedule
      for (let i = targetDayOrder - 1; i >= 0; i--) {
        const prevDay = daysOfWeek[i];
        // Find the schedule in the form values that corresponds to the previous day
        const foundSchedule = allFormSchedules.find(f => f.day === prevDay);

        // Check if the found schedule has all necessary fields filled
        if (foundSchedule && foundSchedule.startTime && foundSchedule.endTime && foundSchedule.room) {
            sourceSchedule = foundSchedule;
            break; // Found a valid source, so stop looking
        }
      }

      if (sourceSchedule) {
          const targetFieldIndex = allFormSchedules.findIndex(f => f.day === targetDay);
          if (targetFieldIndex !== -1) {
            // Use the correct setValue function to update the form state
            setValue(`${name}.${targetFieldIndex}.startTime`, sourceSchedule.startTime);
            setValue(`${name}.${targetFieldIndex}.endTime`, sourceSchedule.endTime);
            setValue(`${name}.${targetFieldIndex}.room`, sourceSchedule.room);
          }
      }
    };

    return (
        <div className="space-y-4 rounded-md border p-4">
          <FormLabel>{label}</FormLabel>
          <FormDescription className="!mt-0 mb-2">{description}</FormDescription>
          <div className="space-y-4">
            {daysOfWeek.map((day) => {
              const fieldIndex = fields.findIndex(f => (f as any).day === day);
              const isChecked = fieldIndex > -1;
              return (
                <div key={day}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${name}-${day}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => handleDayCheckedChange(Boolean(checked), day)}
                    />
                    <label htmlFor={`${name}-${day}`} className="text-sm font-medium leading-none">
                      {day}
                    </label>
                  </div>
                  {isChecked && (
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2 pl-6 items-center">
                       <FormField
                        control={control}
                        name={`${name}.${fieldIndex}.startTime` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`${name}.${fieldIndex}.endTime` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`${name}.${fieldIndex}.room` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Room"
                                {...field}
                                onBlur={(e) => {
                                  field.onBlur();
                                  setValue(`${name}.${fieldIndex}.room`, e.target.value.toUpperCase());
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleCopySchedule(day)}
                        aria-label={`Copy schedule to ${day}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
             <FormField
                control={control}
                name={name}
                render={() => (
                    <FormItem>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        </div>
    )
}


export function AddSubjectForm({ onSuccess, subject }: AddSubjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageAlert, setPageAlert] = useState<{title: string, description: string, variant: 'default' | 'destructive'} | null>(null);
  const firestore = useFirestore();
  
  const isEditMode = !!subject;
  const isEnrollmentOpen = isEditMode && subject.enrollmentStatus === 'open';

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      lectureSchedules: [],
      labSchedules: [],
      schoolYear: '',
      yearLevel: '',
      name: '',
      code: '',
      description: '',
      block: '',
      credits: 3,
      hasLab: false,
      enrollmentStatus: 'closed',
    },
  });
  
  useEffect(() => {
    if (isEditMode && subject) {
      form.reset({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        schoolYear: subject.schoolYear,
        yearLevel: subject.yearLevel,
        credits: subject.credits || 3,
        hasLab: subject.hasLab || false,
        lectureSchedules: subject.lectureSchedules || [],
        labSchedules: subject.labSchedules || [],
        block: subject.block,
        enrollmentStatus: subject.enrollmentStatus || 'closed',
      });
    } else {
        form.reset({
            lectureSchedules: [],
            labSchedules: [],
            schoolYear: '',
            yearLevel: '',
            name: '',
            code: '',
            description: '',
            block: '',
            credits: 3,
            hasLab: false,
            enrollmentStatus: 'closed',
        })
    }
  }, [subject, form, isEditMode]);

  const hasLab = form.watch('hasLab');

  const onSubmit = async (values: SubjectFormValues) => {
    setIsSubmitting(true);
    setPageAlert(null);
    
    const subjectData: Partial<Subject> = values;
    if (!subjectData.hasLab) {
        subjectData.labSchedules = []; // Ensure lab schedules are empty if hasLab is false
    }
    
    const subjectsRef = collection(firestore, 'subjects');

    if (isEditMode && subject) {
        const subjectDocRef = doc(subjectsRef, subject.id);
        updateDoc(subjectDocRef, subjectData).then(() => {
            onSuccess();
        }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: subjectDocRef.path,
                operation: 'update',
                requestResourceData: subjectData,
            }));
            setPageAlert({ title: 'Update Failed', description: 'Could not update subject. Please check permissions.', variant: 'destructive' });
        }).finally(() => {
            setIsSubmitting(false);
        });
    } else {
        addDoc(subjectsRef, subjectData).then(() => {
            onSuccess();
        }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: subjectsRef.path,
                operation: 'create',
                requestResourceData: subjectData,
            }));
            setPageAlert({ title: 'Creation Failed', description: 'Could not create subject. Please check permissions.', variant: 'destructive' });
        }).finally(() => {
            setIsSubmitting(false);
        });
    }
};
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {pageAlert && <Alert variant={pageAlert.variant}><AlertTitle>{pageAlert.title}</AlertTitle><AlertDescription>{pageAlert.description}</AlertDescription></Alert>}
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Subject Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Introduction to Programming" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Subject Code</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., CS101" {...field} disabled={isEnrollmentOpen} />
                    </FormControl>
                    {isEnrollmentOpen && <FormDescription>Code cannot be changed after enrollment starts.</FormDescription>}
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief description of the subject." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="schoolYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Year</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 2024-2025" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="yearLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a year level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="block"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Block / Section</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g., BSIT-B1" {...field} disabled={isEnrollmentOpen} />
                    </FormControl>
                     {isEnrollmentOpen && <FormDescription>Block cannot be changed after enrollment starts.</FormDescription>}
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Credit Units</FormLabel>
                    <FormControl>
                        <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <Separator />

        <div className="space-y-4">
            <ScheduleArray 
                control={form.control}
                setValue={form.setValue}
                getValues={form.getValues}
                name="lectureSchedules"
                label="Lecture Schedule"
                description="Select the days and times for lecture classes."
            />
            <FormField
                control={form.control}
                name="hasLab"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                        <FormLabel className="text-base">
                            Has Laboratory
                        </FormLabel>
                        <FormDescription>
                            Enable this if the subject includes a separate lab schedule.
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                    </FormItem>
                )}
            />
            {hasLab && (
                 <ScheduleArray 
                    control={form.control}
                    setValue={form.setValue}
                    getValues={form.getValues}
                    name="labSchedules"
                    label="Laboratory Schedule"
                    description="Select the days and times for laboratory classes."
                />
            )}
        </div>


        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Subject' : 'Create Subject')}
        </Button>
      </form>
    </Form>
  );
}
