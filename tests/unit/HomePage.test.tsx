import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../../app/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('afiseaza titlul STAX', () => {
    render(<HomePage />);
    expect(screen.getByText('STAX')).toBeInTheDocument();
  });

  it('afiseaza butonul START MATCHMAKING', () => {
    render(<HomePage />);
    expect(screen.getByText('START MATCHMAKING')).toBeInTheDocument();
  });

  it('nu afiseaza modalul la incarcare', () => {
    render(<HomePage />);
    expect(screen.queryByText('Intră în cont')).not.toBeInTheDocument();
  });

  it('deschide modalul la click pe START MATCHMAKING', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByText('START MATCHMAKING'));
    expect(screen.getByText('Intră în cont')).toBeInTheDocument();
  });

  it('inchide modalul la click pe X', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByText('START MATCHMAKING'));
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByText('Intră în cont')).not.toBeInTheDocument();
  });

  it('schimba intre login si signup', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByText('START MATCHMAKING'));
    expect(screen.getByText('Intră în cont')).toBeInTheDocument();

    fireEvent.click(screen.getByText("Nu ai un cont? Apasă aici să creezi unul."));
    expect(screen.getByText('Creează cont nou')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ai deja cont? Loghează-te aici.'));
    expect(screen.getByText('Intră în cont')).toBeInTheDocument();
  });

  it('butonul submit afiseaza textul corect in functie de mod', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByText('START MATCHMAKING'));

    expect(screen.getByRole('button', { name: 'Loghează-te' })).toBeInTheDocument();

    fireEvent.click(screen.getByText("Nu ai un cont? Apasă aici să creezi unul."));
    expect(screen.getByRole('button', { name: 'Creează Cont' })).toBeInTheDocument();
  });
});
