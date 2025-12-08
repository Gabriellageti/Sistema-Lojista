DO $$
DECLARE
  session_id uuid := '6f1a0b78-0ae7-4b9d-9c8c-52be1cdd4f60';
BEGIN
  -- Ensure the sample cash session exists
  IF NOT EXISTS (SELECT 1 FROM public.cash_sessions WHERE id = session_id) THEN
    INSERT INTO public.cash_sessions (
      id,
      date,
      initial_amount,
      is_open,
      is_closed,
      opened_at,
      total_sales,
      total_entries,
      total_exits,
      total_expenses,
      final_amount,
      sales_count,
      average_ticket
    )
    VALUES (
      session_id,
      CURRENT_DATE,
      0,
      false,
      true,
      (NOW() - INTERVAL '6 hours'),
      0,
      0,
      0,
      0,
      0,
      0,
      0
    );
  END IF;

  -- Sample sale with a single item
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE session_id = session_id AND description = 'Venda - Capinha Transparente'
  ) THEN
    INSERT INTO public.transactions (
      id,
      session_id,
      type,
      description,
      quantity,
      unit_price,
      total,
      payment_method,
      items,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      'a7b7345b-a9f3-410b-a44e-2ee629a73f62',
      session_id,
      'venda',
      'Venda - Capinha Transparente',
      1,
      49.90,
      49.90,
      'dinheiro',
      '[{"description":"Capinha Transparente Premium","quantity":1,"unitPrice":49.9,"total":49.9}]'::jsonb,
      'Cliente comprou apenas a capinha transparente.',
      (NOW() - INTERVAL '5 hours'),
      (NOW() - INTERVAL '5 hours')
    );
  END IF;

  -- Sample sale with two items
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE session_id = session_id AND description = 'Venda - Kit Proteção'
  ) THEN
    INSERT INTO public.transactions (
      id,
      session_id,
      type,
      description,
      quantity,
      unit_price,
      total,
      payment_method,
      items,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      '9c8c90b0-96b4-4ab5-8c31-5d6f9d8f8e82',
      session_id,
      'venda',
      'Venda - Kit Proteção',
      2,
      37.45,
      74.90,
      'pix',
      '[{"description":"Película 3D","quantity":1,"unitPrice":29.9,"total":29.9},{"description":"Capa Silicone Colorida","quantity":1,"unitPrice":45.0,"total":45.0}]'::jsonb,
      'Combo com película e capa.',
      (NOW() - INTERVAL '3 hours'),
      (NOW() - INTERVAL '3 hours')
    );
  END IF;

  -- Sample sale with three items
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE session_id = session_id AND description = 'Venda - Kit Completo Smartphone'
  ) THEN
    INSERT INTO public.transactions (
      id,
      session_id,
      type,
      description,
      quantity,
      unit_price,
      total,
      payment_method,
      items,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      'da7cd60e-60c5-4d60-9452-6de55af8981b',
      session_id,
      'venda',
      'Venda - Kit Completo Smartphone',
      3,
      59.90,
      179.70,
      'cartao_credito',
      '[{"description":"Película Vidro Premium","quantity":1,"unitPrice":30.0,"total":30.0},{"description":"Capinha Anti-impacto","quantity":1,"unitPrice":59.9,"total":59.9},{"description":"Carregador Turbo 25W","quantity":1,"unitPrice":89.8,"total":89.8}]'::jsonb,
      'Pacote completo para smartphone.',
      (NOW() - INTERVAL '1 hours'),
      (NOW() - INTERVAL '1 hours')
    );
  END IF;
END $$;
