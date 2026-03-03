import dayjs from 'dayjs';
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker';

/**
 * MUI Digital Time Picker - 24-hour format, large hour/minute, arrows, NOW/CLEAR.
 * Outputs HH:mm format for backend.
 */
const TimePickerField = ({
  value,
  onChange,
  placeholder = 'HH:MM',
  disabled = false,
  hasError = false,
  className = '',
}) => {
  const dayjsValue = value ? dayjs(`2000-01-01 ${value}`) : null;

  const handleChange = (newValue) => {
    if (!newValue || !dayjs(newValue).isValid()) {
      onChange('');
      return;
    }
    const d = dayjs(newValue);
    const hh = String(d.hour()).padStart(2, '0');
    const mm = String(d.minute()).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  return (
    <div className={className}>
      <DesktopTimePicker
        value={dayjsValue}
        onChange={handleChange}
        disabled={disabled}
        ampm={false}
        format="HH:mm"
        localeText={{
          todayButtonLabel: 'Now',
          fieldHoursPlaceholder: () => 'HH',
          fieldMinutesPlaceholder: () => 'MM',
        }}
        slotProps={{
          actionBar: {
            actions: ['clear', 'today', 'accept'],
          },
          textField: {
            placeholder,
            error: hasError,
            size: 'small',
            fullWidth: true,
            sx: {
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: 'white',
                '& fieldset': {
                  borderColor: hasError ? 'rgb(239 68 68)' : 'rgb(209 213 219)',
                },
                '&:hover fieldset': {
                  borderColor: hasError ? 'rgb(239 68 68)' : 'rgb(156 163 175)',
                },
                '&.Mui-focused fieldset': {
                  borderWidth: 2,
                  borderColor: 'rgb(99 102 241)',
                },
                '@media (prefers-color-scheme: dark)': {
                  backgroundColor: 'rgb(55 65 81)',
                  '& fieldset': {
                    borderColor: hasError ? 'rgb(239 68 68)' : 'rgb(75 85 99)',
                  },
                },
              },
              '& .MuiInputBase-input': {
                padding: '10px 14px',
              },
            },
          },
        }}
      />
    </div>
  );
};

export default TimePickerField;
