import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Form from "../src/form";
import Input from "./input-component";
import { useFormContext } from "../src/form-context";

afterEach(cleanup);

const createPromise = () => {
  let resolve: any;
  let reject: any;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return [() => promise, resolve, reject];
};

type ContextReference = { current: ReturnType<typeof useFormContext> | undefined };
const renderForm = ({ onSubmit, validator, formContext }: any) => {
  const MockComponent = () => {
    formContext.current = useFormContext();
    return null;
  };

  render(
    <Form initialValues={{}} validator={validator} onSubmit={onSubmit}>
      <MockComponent />
      <Input attribute="test-input" />
      <button>submit</button>
    </Form>
  );
};

it("will start clean then go dirty when the user inputs a value", async () => {
  const onSubmit = jest.fn();
  const formContext: ContextReference = { current: undefined };
  renderForm({ onSubmit, formContext });

  expect(formContext.current?.status).toBe("clean");
  await userEvent.type(screen.getByLabelText("test-input"), "some value");
  await waitFor(() => expect(formContext.current?.status).toBe("dirty"));
});

it("validate and submit", async () => {
  jest.setTimeout(50000);

  const [validate, validateResolve] = createPromise();
  const [onSubmit, onSubmitResolve] = createPromise();

  const validator = { validate };
  const formContext: ContextReference = { current: undefined };
  renderForm({ onSubmit, formContext, validator });

  expect(formContext.current?.status).toBe("clean");
  await userEvent.type(screen.getByLabelText("test-input"), "some value");

  userEvent.click(screen.getByText("submit"));
  await waitFor(() => expect(formContext.current?.status).toBe("validating"), { timeout: 5000 });
  validateResolve();

  await waitFor(() => expect(formContext.current?.status).toBe("submitting"), { timeout: 5000 });
  onSubmitResolve();

  await waitFor(() => expect(formContext.current?.status).toBe("clean"), { timeout: 5000 });
});

it("will have the error status", async () => {
  const validator = {
    validate() {
      return { "test-input": ["The error message"] };
    },
  };

  const onSubmit = jest.fn();
  const formContext: ContextReference = { current: undefined };
  renderForm({ onSubmit, formContext, validator });

  userEvent.click(screen.getByText("submit"));
  await waitFor(() => expect(formContext.current?.status).toBe("error"));
});
